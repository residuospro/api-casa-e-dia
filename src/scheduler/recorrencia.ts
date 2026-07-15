import { schedule, type ScheduledTask } from 'node-cron';
import { tarefaRepository } from '../repositories/tarefa.repository';
import { gerarExecucoesRecorrentes } from '../services/tarefa.service';
import type { Recorrencia } from '../models/tarefa.model';

let task: ScheduledTask | null = null;

const DIAS_A_FRENTE_SEM_CICLO = 7;

export function initRecorrenciaScheduler(): void {
  task = schedule('0 0 * * 0', async () => {
    console.log('[RecorrenciaScheduler] Iniciando extensão semanal de recorrências...');
    try {
      await estenderRecorrencias();
    } catch (error) {
      console.error('[RecorrenciaScheduler] Erro ao estender recorrências:', error);
    }
  });

  console.log('[RecorrenciaScheduler] Agendado para executar todo domingo à meia-noite (0 0 * * 0)');
}

function calcularDiasAteFimCiclo(ciclo: { inicio: Date; duracaoDias: number; proximaRenovacao: Date | null } | null, recorrencia: Recorrencia): number {
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

async function estenderRecorrencias(): Promise<void> {
  const tarefas = await tarefaRepository.findTarefasComRecorrencia();

  if (tarefas.length === 0) {
    console.log('[RecorrenciaScheduler] Nenhuma tarefa com recorrência encontrada');
    return;
  }

  console.log(`[RecorrenciaScheduler] ${tarefas.length} tarefa(s) com recorrência`);

  const agora = new Date();
  let geradas = 0;

  for (const tarefa of tarefas) {
    const recorrencia = tarefa.recorrencia as Recorrencia | null;
    if (!recorrencia) continue;

    const ciclo = (tarefa as any).ciclo as { inicio: Date; duracaoDias: number; proximaRenovacao: Date | null } | null;
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
        novas.map((e) => ({ data: e.data, status: e.status })),
      );
      geradas += novas.length;
    }
  }

  console.log(`[RecorrenciaScheduler] ${geradas} execução(ões) gerada(s)`);
}

export function stopRecorrenciaScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[RecorrenciaScheduler] Parado');
  }
}
