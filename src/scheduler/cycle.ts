import { schedule, type ScheduledTask } from 'node-cron';
import { cycleSchedulerService } from '../services/cycle-scheduler.service';

let task: ScheduledTask | null = null;

export function initCycleScheduler(): void {
  task = schedule('0 0 * * *', async () => {
    console.log('[CycleScheduler] Iniciando verificação diária de ciclos expirados...');
    try {
      await cycleSchedulerService.verificarCiclosExpirados();
    } catch (error) {
      console.error('[CycleScheduler] Erro ao verificar ciclos expirados:', error);
    }
  });

  console.log('[CycleScheduler] Agendado para executar diariamente à meia-noite (0 0 * * *)');
}

export function stopCycleScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[CycleScheduler] Parado');
  }
}
