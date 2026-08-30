import { TipoMetaFinanceira, StatusMetaFinanceira, TipoMovimentacaoMeta } from '../enums';

export interface MetaFinanceira {
  id: string;
  familiaId: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoMetaFinanceira;
  valorObjetivo: number;
  valorAtual: number;
  dataLimite: Date | null;
  contaDestinoId: string | null;
  status: StatusMetaFinanceira;
  imagem: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarMetaFinanceiraDTO {
  titulo: string;
  descricao?: string | null;
  tipo?: TipoMetaFinanceira;
  valorObjetivo: number;
  dataLimite?: string;
  contaDestinoId?: string | null;
  imagem?: string | null;
}

export interface AtualizarMetaFinanceiraDTO {
  titulo?: string;
  descricao?: string | null;
  tipo?: TipoMetaFinanceira;
  valorObjetivo?: number;
  dataLimite?: string;
  contaDestinoId?: string | null;
  imagem?: string | null;
}

export interface MovimentacaoMetaFinanceiraDTO {
  valor: number;
  tipo: TipoMovimentacaoMeta;
  observacao?: string | null;
}

export interface HistoricoMetaFinanceira {
  id: string;
  metaFinanceiraId: string;
  usuarioId: string;
  tipo: TipoMovimentacaoMeta;
  valor: number;
  saldoAnterior: number;
  saldoNovo: number;
  observacao: string | null;
  criadoEm: Date;
}

export interface FiltrosMetaFinanceira {
  status?: StatusMetaFinanceira[];
  tipo?: TipoMetaFinanceira[];
  busca?: string;
}