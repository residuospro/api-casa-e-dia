import { FrequenciaRecorrenciaFinanceira } from '../enums';

export interface RecorrenciaFinanceira {
  id: string;
  familiaId: string;
  lancamentoModeloId: string;
  titulo: string;
  frequencia: FrequenciaRecorrenciaFinanceira;
  intervalo: number;
  proximaExecucao: Date;
  ultimaExecucao: Date | null;
  ativa: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarRecorrenciaFinanceiraDTO {
  lancamentoModeloId: string;
  titulo: string;
  frequencia: FrequenciaRecorrenciaFinanceira;
  intervalo?: number;
  proximaExecucao: string;
}

export interface AtualizarRecorrenciaFinanceiraDTO {
  titulo?: string;
  frequencia?: FrequenciaRecorrenciaFinanceira;
  intervalo?: number;
  proximaExecucao?: string;
  ativa?: boolean;
}

export interface AlterarStatusRecorrenciaDTO {
  ativa: boolean;
}

export interface FiltrosRecorrencia {
  ativa?: boolean;
  frequencia?: FrequenciaRecorrenciaFinanceira[];
}
