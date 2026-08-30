import { recorrenciaFinanceiraService } from './recorrencia-financeira.service';

/**
 * Ponte desacoplada entre o scheduler (cron) e a regra financeira de
 * recorrencias. O scheduler apenas sabe que existem recorrencias com
 * proximaExecucao no passado e chama este handler, que por sua vez delega
 * ao service financeiro. Nenhuma regra de criacao de lancamento habita aqui.
 */
export class FinanceRecurringHandler {
  async processarRecorrencias(): Promise<{ processadas: number; geradas: number }> {
    const agora = new Date();
    const resumo = await recorrenciaFinanceiraService.processarExecucoesPendentes(agora);
    return resumo;
  }
}

export const financeRecurringHandler = new FinanceRecurringHandler();
