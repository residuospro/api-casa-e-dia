import { schedule, type ScheduledTask } from 'node-cron';
import { schedulerService } from '../services/scheduler.service';
import { env } from '../config/env';
import { schedulerRegistry } from './registry';

let task: ScheduledTask | null = null;

export function initScheduler(): void {
  const interval = env.schedulerInterval;

  schedulerRegistry.registrar({
    meta: {
      identificador: 'principal',
      nome: 'Scheduler principal de tarefas',
      descricao:
        'Verifica tarefas que vencem hoje, marca execuções atrasadas e perdidas e envia notificações.',
      cron: interval,
      timezone: null,
    },
    executar: async () => schedulerService.executar(),
  });

  task = schedule(interval, async () => {
    try {
      await schedulerRegistry.executar('principal', 'AGENDADO');
    } catch (error) {
      console.error('[Scheduler] Erro ao executar scheduler principal:', error);
    }
  });

  console.log(`[Scheduler] Iniciado com intervalo "${interval}"`);
}

export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[Scheduler] Parado');
  }
}
