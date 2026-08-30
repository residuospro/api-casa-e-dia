import { schedule, type ScheduledTask } from 'node-cron';
import { financeRecurringHandler } from '../services/financeiro/finance-recurring-handler';

let task: ScheduledTask | null = null;

export function initFinanceRecorrenciaScheduler(): void {
  task = schedule('* * * * *', async () => {
    console.log('[FinanceRecorrenciaScheduler] Processando recorrencias financeiras...');
    try {
      const resumo = await financeRecurringHandler.processarRecorrencias();
      console.log(
        `[FinanceRecorrenciaScheduler] Concluído | ${resumo.processadas} recorrencia(s) processada(s) | ${resumo.geradas} ocorrencia(s) gerada(s)`,
      );
    } catch (error) {
      console.error(
        '[FinanceRecorrenciaScheduler] Erro ao processar recorrencias financeiras:',
        error,
      );
    }
  });

  console.log('[FinanceRecorrenciaScheduler] Agendado para executar a cada minuto (* * * * *)');
}

export function stopFinanceRecorrenciaScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[FinanceRecorrenciaScheduler] Parado');
  }
}
