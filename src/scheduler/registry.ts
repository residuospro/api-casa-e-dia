import { schedulerLogRepository } from '../repositories/scheduler-log.repository';

export type OrigemExecucao = 'AGENDADO' | 'MANUAL';
export type StatusExecucaoLog = 'SUCESSO' | 'ERRO';

export interface SchedulerMeta {
  identificador: string;
  nome: string;
  descricao: string;
  cron: string;
  timezone: string | null;
}

export interface UltimaExecucao {
  status: StatusExecucaoLog;
  rodouEm: Date;
  duracaoMs: number;
  origem: OrigemExecucao;
  detalhes?: Record<string, unknown> | null;
  erro?: string | null;
}

export interface EstadoScheduler {
  meta: SchedulerMeta;
  executando: boolean;
  ultimaExecucao: UltimaExecucao | null;
  proximaExecucao: Date | null;
}

type ResultadoExecucao = Record<string, number> | void;

interface SchedulerRegistro {
  meta: SchedulerMeta;
  executar: () => Promise<ResultadoExecucao>;
}

interface Campo {
  qualquer: boolean;
  passos?: number;
  lista?: number[];
}

function parseCronCampo(expressao: string): Campo {
  const e = expressao.trim();
  if (e === '*' || e === '?') return { qualquer: true };
  if (e.startsWith('*/')) {
    return { qualquer: false, passos: Number(e.slice(2)) || 1 };
  }
  const lista = e
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
  return { qualquer: false, lista };
}

function campoMatch(campo: Campo, valor: number): boolean {
  if (campo.qualquer) return true;
  if (campo.passos) return valor % campo.passos === 0;
  return (campo.lista ?? []).includes(valor);
}

const DIAS_SEMANA: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function obterPartesNoFuso(data: Date, timezone?: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const partes = fmt.formatToParts(data);
  const mapa: Record<string, string> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') mapa[parte.type] = parte.value;
  }

  const hora = Number(mapa.hour === '24' ? '0' : mapa.hour);

  return {
    minuto: Number(mapa.minute),
    hora,
    dia: Number(mapa.day),
    mes: Number(mapa.month),
    diaSemana: DIAS_SEMANA[mapa.weekday] ?? 0,
  };
}

/**
 * Calcula a próxima execução de uma expressão cron de 5 campos
 * (minuto, hora, dia do mês, mês, dia da semana) em um fuso horário.
 */
export function calcularProximaExecucao(
  cron: string,
  timezone: string | null,
  referencia: Date = new Date(),
): Date {
  const partes = cron.trim().split(/\s+/).slice(0, 5);

  const campoMinuto = parseCronCampo(partes[0] ?? '*');
  const campoHora = parseCronCampo(partes[1] ?? '*');
  const campoDiaMes = parseCronCampo(partes[2] ?? '*');
  const campoMes = parseCronCampo(partes[3] ?? '*');
  const campoDiaSem = parseCronCampo(partes[4] ?? '*');

  const diaMesRestrito = !campoDiaMes.qualquer;
  const diaSemRestrito = !campoDiaSem.qualquer;

  const candidato = new Date(referencia.getTime() + 60_000);
  const limiteIteracoes = 366 * 24 * 60;

  for (let i = 0; i < limiteIteracoes; i++) {
    const p = obterPartesNoFuso(candidato, timezone ?? undefined);

    const mesOk = campoMatch(campoMes, p.mes);
    if (!mesOk) {
      candidato.setTime(candidato.getTime() + 60_000);
      continue;
    }

    const diaMesOk = campoMatch(campoDiaMes, p.dia);
    const diaSemOk = campoMatch(campoDiaSem, p.diaSemana % 7);

    let diaOk: boolean;
    if (diaMesRestrito && diaSemRestrito) {
      diaOk = diaMesOk || diaSemOk;
    } else if (diaMesRestrito) {
      diaOk = diaMesOk;
    } else if (diaSemRestrito) {
      diaOk = diaSemOk;
    } else {
      diaOk = true;
    }

    if (diaOk && campoMatch(campoHora, p.hora) && campoMatch(campoMinuto, p.minuto)) {
      return candidato;
    }

    candidato.setTime(candidato.getTime() + 60_000);
  }

  return new Date(referencia.getTime() + 24 * 60 * 60 * 1000);
}

const estados = new Map<string, EstadoScheduler & { executar: SchedulerRegistro['executar'] }>();

export const schedulerRegistry = {
  registrar(registro: SchedulerRegistro): void {
    estados.set(registro.meta.identificador, {
      meta: registro.meta,
      executando: false,
      ultimaExecucao: null,
      proximaExecucao: calcularProximaExecucao(registro.meta.cron, registro.meta.timezone),
      executar: registro.executar,
    });
    console.log(
      `[SchedulerRegistry] "${registro.meta.nome}" registrado (cron: ${registro.meta.cron})`,
    );
  },

  obterTodos(): EstadoScheduler[] {
    return Array.from(estados.values(), ({ executar: _executar, ...estado }) => estado);
  },

  obter(identificador: string): EstadoScheduler | null {
    const estado = estados.get(identificador);
    if (!estado) return null;
    const { executar: _executar, ...semExecutor } = estado;
    return semExecutor;
  },

  async executar(
    identificador: string,
    origem: OrigemExecucao = 'AGENDADO',
  ): Promise<{ detalhes?: Record<string, unknown>; duracaoMs: number }> {
    const estado = estados.get(identificador);
    if (!estado) {
      throw new Error(`Scheduler "${identificador}" não registrado`);
    }

    if (estado.executando) {
      throw new Error(`Scheduler "${estado.meta.nome}" já está em execução`);
    }

    estado.executando = true;
    const iniciadoEm = new Date();

    try {
      const resultado = await estado.executar();
      const terminadoEm = new Date();
      const duracaoMs = terminadoEm.getTime() - iniciadoEm.getTime();

      const detalhes = resultado && typeof resultado === 'object' ? resultado : undefined;

      estado.ultimaExecucao = {
        status: 'SUCESSO',
        rodouEm: iniciadoEm,
        duracaoMs,
        origem,
        detalhes,
      };
      estado.proximaExecucao = calcularProximaExecucao(
        estado.meta.cron,
        estado.meta.timezone,
        terminadoEm,
      );

      await schedulerLogRepository.criar({
        identificador,
        nome: estado.meta.nome,
        origem,
        status: 'SUCESSO',
        iniciadoEm,
        terminadoEm,
        duracaoMs,
        detalhes,
      });

      console.log(
        `[SchedulerRegistry] "${estado.meta.nome}" concluído em ${duracaoMs}ms (${origem})`,
      );

      return { detalhes, duracaoMs };
    } catch (error) {
      const terminadoEm = new Date();
      const duracaoMs = terminadoEm.getTime() - iniciadoEm.getTime();
      const erro = error instanceof Error ? error.message : String(error);

      estado.ultimaExecucao = {
        status: 'ERRO',
        rodouEm: iniciadoEm,
        duracaoMs,
        origem,
        erro,
      };
      estado.proximaExecucao = calcularProximaExecucao(
        estado.meta.cron,
        estado.meta.timezone,
        terminadoEm,
      );

      await schedulerLogRepository.criar({
        identificador,
        nome: estado.meta.nome,
        origem,
        status: 'ERRO',
        iniciadoEm,
        terminadoEm,
        duracaoMs,
        erro,
      });

      console.error(`[SchedulerRegistry] "${estado.meta.nome}" erro após ${duracaoMs}ms:`, erro);

      throw error;
    } finally {
      estado.executando = false;
    }
  },
};
