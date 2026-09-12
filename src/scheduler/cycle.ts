import { schedule, type ScheduledTask } from 'node-cron';
import { cycleSchedulerService } from '../services/cycle-scheduler.service';
import { schedulerRegistry } from './registry';

let task: ScheduledTask | null = null;

export function initCycleScheduler(): void {
  schedulerRegistry.registrar({
    meta: {
      identificador: 'ciclos',
      nome: 'Scheduler de ciclos',
      descricao:
        'Verifica diariamente ciclos expirados, renovando (e rotacionando tarefas) ou encerrando ciclos conforme configurado.',
      cron: '0 18 * * *',
      timezone: 'America/Sao_Paulo',
    },
    executar: async () => cycleSchedulerService.verificarCiclosExpirados(),
  });

  task = schedule(
    '0 18 * * *',
    async () => {
      console.log('[CycleScheduler] Iniciando verificação diária de ciclos expirados...');
      try {
        await schedulerRegistry.executar('ciclos', 'AGENDADO');
      } catch (error) {
        console.error('[CycleScheduler] Erro ao verificar ciclos expirados:', error);
      }
    },
    { timezone: 'America/Sao_Paulo' },
  );

  console.log('[CycleScheduler] Agendado para executar diariamente às 18h (0 18 * * *)');
}

export function stopCycleScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[CycleScheduler] Parado');
  }
}
