import { schedule, type ScheduledTask } from 'node-cron';
import { tarefaRepository } from '../repositories/tarefa.repository';
import { gerarExecucoesRecorrentes } from '../services/tarefa.service';
import type { Recorrencia } from '../models/tarefa.model';
import { schedulerRegistry } from './registry';

let task: ScheduledTask | null = null;

const DIAS_A_FRENTE_SEM_CICLO = 7;

export function initRecorrenciaScheduler(): void {
  schedulerRegistry.registrar({
    meta: {
      identificador: 'recorrencia',
      nome: 'Scheduler de recorrências',
      descricao:
        'Semanalmente estende as execuções futuras de tarefas com recorrência (recorrencia JSON), gerando novas execuções.',
      cron: '0 18 * * 0',
      timezone: 'America/Sao_Paulo',
    },
    executar: async () => estenderRecorrencias(),
  });

  task = schedule(
    '0 18 * * 0',
    async () => {
      console.log('[RecorrenciaScheduler] Iniciando extensão semanal de recorrências...');
      try {
        await schedulerRegistry.executar('recorrencia', 'AGENDADO');
      } catch (error) {
        console.error('[RecorrenciaScheduler] Erro ao estender recorrências:', error);
      }
    },
    { timezone: 'America/Sao_Paulo' },
  );

  console.log('[RecorrenciaScheduler] Agendado para executar todo domingo às 18h (0 18 * * 0)');
}

function calcularDiasAteFimCiclo(
  ciclo: { inicio: Date; duracaoDias: number; proximaRenovacao: Date | null } | null,
  recorrencia: Recorrencia,
): number {
  if (ciclo) {
    const fimCiclo = ciclo.proximaRenovacao
      ? new Date(ciclo.proximaRenovacao)
      : new Date(ciclo.inicio.getTime() + ciclo.duracaoDias * 24 * 60 * 60 * 1000);

    const agora = new Date();
    const diffMs = fimCiclo.getTime() - agora.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (recorrencia.dataFim) {
    const agora = new Date();
    const dataFim = new Date(recorrencia.dataFim);
    const diffMs = dataFim.getTime() - agora.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return DIAS_A_FRENTE_SEM_CICLO;
}

export async function estenderRecorrencias(): Promise<{
  tarefasProcessadas: number;
  execucoesGeradas: number;
}> {
  const tarefas = await tarefaRepository.findTarefasComRecorrencia();

  if (tarefas.length === 0) {
    console.log('[RecorrenciaScheduler] Nenhuma tarefa com recorrência encontrada');
    return { tarefasProcessadas: 0, execucoesGeradas: 0 };
  }

  console.log(`[RecorrenciaScheduler] ${tarefas.length} tarefa(s) com recorrência`);

  const agora = new Date();
  let geradas = 0;
  let processadas = 0;

  for (const tarefa of tarefas) {
    const recorrencia = tarefa.recorrencia as Recorrencia | null;
    if (!recorrencia) continue;

    const ciclo = (tarefa as any).ciclo as {
      inicio: Date;
      duracaoDias: number;
      proximaRenovacao: Date | null;
    } | null;
    const diasAFrente = calcularDiasAteFimCiclo(ciclo, recorrencia);

    const execucoesFuturas = await tarefaRepository.countExecucoesFuturas(tarefa.id, agora);

    if (execucoesFuturas >= diasAFrente) continue;

    const ultimaExecucao = await tarefaRepository.findUltimaExecucaoFutura(tarefa.id, agora);
    const dataRef = ultimaExecucao
      ? new Date(ultimaExecucao.data.getTime() + 24 * 60 * 60 * 1000)
      : agora;

    const novas = gerarExecucoesRecorrentes(recorrencia, dataRef, diasAFrente);

    if (novas.length > 0) {
      await tarefaRepository.createExecucoes(
        tarefa.id,
        novas.map((e) => ({ data: e.data, status: e.status, iteracao: tarefa.cicloIteracao ?? 0 })),
      );
      geradas += novas.length;
    }
    processadas++;
  }

  console.log(`[RecorrenciaScheduler] ${geradas} execução(ões) gerada(s)`);
  return { tarefasProcessadas: processadas, execucoesGeradas: geradas };
}

export function stopRecorrenciaScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[RecorrenciaScheduler] Parado');
  }
}
