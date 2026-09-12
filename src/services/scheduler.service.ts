import { schedulerRepository } from '../repositories/scheduler.repository';
import { notificationService } from './notification.service';
import { NotificacaoTipo } from '../models/enums';

function resolverDestinatarios(execucao: any): { usuarioId: string }[] {
  const destinatarios: { usuarioId: string }[] = [];
  const vistos = new Set<string>();

  const executor = execucao.executor;
  if (executor?.usuario?.id && !vistos.has(executor.usuario.id)) {
    destinatarios.push({ usuarioId: executor.usuario.id });
    vistos.add(executor.usuario.id);
  }

  const responsavel = execucao.tarefa?.responsavelAtual;
  if (responsavel?.usuario?.id && !vistos.has(responsavel.usuario.id)) {
    destinatarios.push({ usuarioId: responsavel.usuario.id });
    vistos.add(responsavel.usuario.id);
  }

  const participantes = execucao.tarefa?.participantes ?? [];
  for (const pt of participantes) {
    const usuarioId = pt.membro?.usuario?.id;
    if (usuarioId && !vistos.has(usuarioId)) {
      destinatarios.push({ usuarioId });
      vistos.add(usuarioId);
    }
  }

  if (destinatarios.length === 0) {
    const admin = execucao.tarefa?.familia?.membros?.[0];
    if (admin?.usuario?.id) {
      destinatarios.push({ usuarioId: admin.usuario.id });
    }
  }

  return destinatarios;
}

export class SchedulerService {
  async executar(): Promise<{
    notificacoesVenceHoje: number;
    execucoesAtrasadas: number;
    execucoesPerdidas: number;
    notificacoesAtraso: number;
  }> {
    const inicio = Date.now();

    const notificadasHoje = await this.notificarVenceHoje();

    const atrasadas = await schedulerRepository.atualizarExecucoesAtrasadas();

    const perdidas = await schedulerRepository.marcarExecucoesPerdidas();

    const notificadasAtraso = await this.notificarAtrasadas();

    const resultado = {
      notificacoesVenceHoje: notificadasHoje,
      execucoesAtrasadas: atrasadas.count,
      execucoesPerdidas: perdidas.count,
      notificacoesAtraso: notificadasAtraso,
    };

    const duracao = Date.now() - inicio;
    console.log(
      `[Scheduler] Ciclo concluído em ${duracao}ms` +
        ` | ${resultado.notificacoesVenceHoje} notificação(ões) "Vence hoje"` +
        ` | ${resultado.execucoesAtrasadas} execução(ões) marcada(s) como ATRASADA` +
        ` | ${resultado.execucoesPerdidas} execução(ões) marcada(s) como PERDIDA` +
        ` | ${resultado.notificacoesAtraso} notificação(ões) de atraso`,
    );

    return resultado;
  }

  private async notificarVenceHoje(): Promise<number> {
    const execucoes = await schedulerRepository.findExecucoesVenceHoje();

    if (execucoes.length === 0) return 0;

    const idsNotificadas: string[] = [];

    for (const execucao of execucoes) {
      const tarefa = (execucao as any).tarefa;
      const destinatarios = resolverDestinatarios(execucao);

      if (destinatarios.length === 0) continue;

      const horario = execucao.data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      const titulo = `Tarefa vence hoje: ${tarefa.titulo}`;
      const mensagem = `A tarefa "${tarefa.titulo}" vence hoje às ${horario}. Não se esqueça de concluí-la!`;

      const dados = JSON.stringify({
        execucaoId: execucao.id,
        tarefaId: tarefa.id,
        tipo: 'VENCE_HOJE',
      });

      for (const dest of destinatarios) {
        await notificationService.criar({
          usuarioId: dest.usuarioId,
          tipo: NotificacaoTipo.EXECUCAO_TAREFA,
          titulo,
          mensagem,
          dados,
        });
      }

      idsNotificadas.push(execucao.id);
    }

    if (idsNotificadas.length > 0) {
      await schedulerRepository.marcarNotificacaoCriadaBatch(idsNotificadas);
    }

    return idsNotificadas.length;
  }

  private async notificarAtrasadas(): Promise<number> {
    const execucoes = await schedulerRepository.findExecucoesAtrasadasParaNotificar();

    if (execucoes.length === 0) return 0;

    const idsNotificadas: string[] = [];

    for (const execucao of execucoes) {
      const tarefa = (execucao as any).tarefa;
      const destinatarios = resolverDestinatarios(execucao);

      if (destinatarios.length === 0) continue;

      const titulo = `Tarefa atrasada: ${tarefa.titulo}`;
      const mensagem = `A tarefa "${tarefa.titulo}" está atrasada! O prazo venceu no dia ${execucao.data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Corra para concluí-la.`;

      const dados = JSON.stringify({
        execucaoId: execucao.id,
        tarefaId: tarefa.id,
        tipo: 'ATRASADA',
      });

      for (const dest of destinatarios) {
        await notificationService.criar({
          usuarioId: dest.usuarioId,
          tipo: NotificacaoTipo.EXECUCAO_TAREFA,
          titulo,
          mensagem,
          dados,
        });
      }

      idsNotificadas.push(execucao.id);
    }

    if (idsNotificadas.length > 0) {
      await schedulerRepository.marcarNotificacaoAtrasadaBatch(idsNotificadas);
    }

    return idsNotificadas.length;
  }
}

export const schedulerService = new SchedulerService();
