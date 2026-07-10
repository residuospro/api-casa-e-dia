import { cicloRepository } from '../repositories/ciclo.repository';
import { tarefaRepository } from '../repositories/tarefa.repository';
import { familyRepository } from '../repositories/family.repository';
import { notificationService } from './notification.service';
import { NotificacaoTipo } from '../models/enums';
import { renovarExecucoesTarefa } from './tarefa.service';

function getUsuarios(membros: { id: string; usuarioId: string | null; nome: string | null }[]) {
  return membros.filter((m) => m.usuarioId).map((m) => m.usuarioId!);
}

export class CycleSchedulerService {
  async verificarCiclosExpirados(): Promise<void> {
    const ciclos = await cicloRepository.findCiclosVencidosGlobally();

    if (ciclos.length === 0) {
      console.log('[CycleScheduler] Nenhum ciclo expirado encontrado');
      return;
    }

    console.log(`[CycleScheduler] ${ciclos.length} ciclo(s) expirado(s) encontrado(s)`);

    for (const ciclo of ciclos) {
      if (ciclo.renovacaoAutomatica) {
        await this.renovarCiclo(ciclo);
      } else {
        await this.encerrarCiclo(ciclo);
      }
    }
  }

  private async renovarCiclo(ciclo: {
    id: string;
    familiaId: string;
    nome: string;
    duracaoDias: number;
    participantes: string[];
    revezamentoAutomatico: boolean;
  }): Promise<void> {
    const agora = new Date();

    await cicloRepository.update(ciclo.id, {
      renovadoEm: agora,
      proximaRenovacao: new Date(agora.getTime() + ciclo.duracaoDias * 24 * 60 * 60 * 1000),
      expirado: false,
    });

    if (ciclo.revezamentoAutomatico) {
      await this.rotacionarTarefas(ciclo);
    } else {
      await this.notificarRevezamentoPendente(ciclo);
    }

    console.log(`[CycleScheduler] Ciclo "${ciclo.nome}" renovado automaticamente`);
  }

  private async encerrarCiclo(ciclo: {
    id: string;
    familiaId: string;
    nome: string;
    participantes: string[];
  }): Promise<void> {
    await cicloRepository.update(ciclo.id, { ativo: false });

    await this.notificarCicloEncerrado(ciclo);

    console.log(`[CycleScheduler] Ciclo "${ciclo.nome}" encerrado (ativo = false)`);
  }

  private async rotacionarTarefas(ciclo: {
    id: string;
    familiaId: string;
    participantes: string[];
  }): Promise<void> {
    const tarefas = await tarefaRepository.findRevezamentoByCiclo(ciclo.id);
    if (tarefas.length === 0) return;

    let membros = ciclo.participantes;

    if (membros.length === 0) {
      const membrosAtivos = await familyRepository.findMembrosAtivosByFamilia(ciclo.familiaId);
      membros = membrosAtivos.map((m) => m.id);
    }

    if (membros.length === 0) return;

    const cicloAtual = await cicloRepository.findById(ciclo.id);
    const proximaIteracao = (cicloAtual?.iteracao ?? 0) + 1;

    membros.sort((a, b) => a.localeCompare(b));

    const updates = tarefas.map((tarefa, indice) => {
      const membroId = membros[(indice + proximaIteracao) % membros.length];
      return tarefaRepository.updateResponsavel(tarefa.id, membroId, proximaIteracao);
    });

    await Promise.all(updates);

    await cicloRepository.update(ciclo.id, { iteracao: proximaIteracao });

    if (cicloAtual) {
      const agora = new Date();
      for (const tarefa of tarefas) {
        if (tarefa.cicloIteracao != null) {
          await renovarExecucoesTarefa(tarefa.id, proximaIteracao, agora, cicloAtual.duracaoDias);
        }
      }
    }

    console.log(`[CycleScheduler] ${tarefas.length} tarefa(s) rotacionada(s) automaticamente`);
  }

  private async getUsuariosNotificar(ciclo: {
    familiaId: string;
    participantes: string[];
  }): Promise<string[]> {
    if (ciclo.participantes.length > 0) {
      const membros = await familyRepository.findMembrosByIds(ciclo.participantes);
      return getUsuarios(membros);
    }

    const membros = await familyRepository.findMembrosAtivosByFamilia(ciclo.familiaId);
    return getUsuarios(membros);
  }

  private async notificarRevezamentoPendente(ciclo: {
    id: string;
    familiaId: string;
    nome: string;
    participantes: string[];
  }): Promise<void> {
    const usuarios = await this.getUsuariosNotificar(ciclo);

    for (const usuarioId of usuarios) {
      await notificationService.criar({
        usuarioId,
        tipo: NotificacaoTipo.CICLO_VENCIDO,
        titulo: 'Ciclo renovado — rotacione as tarefas',
        mensagem: `O ciclo "${ciclo.nome}" foi renovado automaticamente, mas as tarefas de revezamento precisam ser rotacionadas manualmente. Acesse a página do ciclo e clique em "Rotacionar".`,
        dados: JSON.stringify({ cicloId: ciclo.id, tipo: 'REVEZAMENTO_PENDENTE' }),
      });
    }
  }

  private async notificarCicloEncerrado(ciclo: {
    id: string;
    familiaId: string;
    nome: string;
    participantes: string[];
  }): Promise<void> {
    const usuarios = await this.getUsuariosNotificar(ciclo);

    for (const usuarioId of usuarios) {
      await notificationService.criar({
        usuarioId,
        tipo: NotificacaoTipo.CICLO_VENCIDO,
        titulo: 'Ciclo encerrado',
        mensagem: `O ciclo "${ciclo.nome}" foi encerrado. Crie um novo ciclo para continuar gerenciando as tarefas.`,
        dados: JSON.stringify({ cicloId: ciclo.id, tipo: 'CICLO_ENCERRADO' }),
      });
    }
  }
}

export const cycleSchedulerService = new CycleSchedulerService();
