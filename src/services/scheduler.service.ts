import { schedulerRepository } from '../repositories/scheduler.repository';
import { notificationService } from './notification.service';
import { NotificacaoTipo } from '../models/enums';

export class SchedulerService {
  async executar(): Promise<void> {
    const inicio = Date.now();

    const notificadasHoje = await this.notificarVenceHoje();

    const atrasadas = await schedulerRepository.atualizarExecucoesAtrasadas();

    const notificadasAtraso = await this.notificarAtrasadas();

    const duracao = Date.now() - inicio;
    console.log(
      `[Scheduler] Ciclo concluído em ${duracao}ms` +
        ` | ${notificadasHoje} notificação(ões) "Vence hoje"` +
        ` | ${atrasadas.count} execução(ões) marcada(s) como ATRASADA` +
        ` | ${notificadasAtraso} notificação(ões) de atraso`,
    );
  }

  private async notificarVenceHoje(): Promise<number> {
    const execucoes = await schedulerRepository.findExecucoesVenceHoje();

    if (execucoes.length === 0) return 0;

    const idsNotificadas: string[] = [];

    for (const execucao of execucoes) {
      const tarefa = execucao.tarefa;
      const responsavel = tarefa.responsavelAtual;

      if (!responsavel?.usuario) continue;

      const horario = execucao.data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const titulo = `Tarefa vence hoje: ${tarefa.titulo}`;
      const mensagem = `A tarefa "${tarefa.titulo}" vence hoje às ${horario}. Não se esqueça de concluí-la!`;

      const dados = JSON.stringify({
        execucaoId: execucao.id,
        tarefaId: tarefa.id,
        tipo: 'VENCE_HOJE',
      });

      await notificationService.criar({
        usuarioId: responsavel.usuario.id,
        tipo: NotificacaoTipo.EXECUCAO_TAREFA,
        titulo,
        mensagem,
        dados,
      });

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
      const tarefa = execucao.tarefa;
      const responsavel = tarefa.responsavelAtual;

      if (!responsavel?.usuario) continue;

      const titulo = `Tarefa atrasada: ${tarefa.titulo}`;
      const mensagem = `A tarefa "${tarefa.titulo}" está atrasada! O prazo venceu no dia ${execucao.data.toLocaleDateString('pt-BR')}. Corra para concluí-la.`;

      const dados = JSON.stringify({
        execucaoId: execucao.id,
        tarefaId: tarefa.id,
        tipo: 'ATRASADA',
      });

      await notificationService.criar({
        usuarioId: responsavel.usuario.id,
        tipo: NotificacaoTipo.EXECUCAO_TAREFA,
        titulo,
        mensagem,
        dados,
      });

      idsNotificadas.push(execucao.id);
    }

    if (idsNotificadas.length > 0) {
      await schedulerRepository.marcarNotificacaoAtrasadaBatch(idsNotificadas);
    }

    return idsNotificadas.length;
  }
}

export const schedulerService = new SchedulerService();
