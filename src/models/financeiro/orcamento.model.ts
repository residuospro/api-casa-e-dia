import { IndicadorOrcamento } from '../enums';

export interface Orcamento {
  id: string;
  familiaId: string;
  categoriaId: string;
  contaId: string;
  mes: number;
  ano: number;
  valorLimite: number;
  valorAtual: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarOrcamentoDTO {
  categoriaId: string;
  contaId: string;
  mes: number;
  ano: number;
  valorLimite: number;
}

export interface AtualizarOrcamentoDTO {
  valorLimite?: number;
  contaId?: string;
}

export interface FiltrosOrcamento {
  mes?: number;
  ano?: number;
  categoriaId?: string;
  status?: IndicadorOrcamento[];
  busca?: string;
}