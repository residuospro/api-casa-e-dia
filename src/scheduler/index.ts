import { schedule, type ScheduledTask } from 'node-cron';
import { schedulerService } from '../services/scheduler.service';
import { env } from '../config/env';

let task: ScheduledTask | null = null;

export function initScheduler(): void {
  const interval = env.schedulerInterval;

  task = schedule(interval, async () => {
    try {
      await schedulerService.executar();
    } catch (error) {
      console.error('[Scheduler] Erro ao executar ciclo:', error);
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
