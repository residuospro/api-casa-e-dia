import { TipoMetaFinanceira, StatusMetaFinanceira } from '../enums';

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
  descricao?: string;
  tipo?: TipoMetaFinanceira;
  valorObjetivo: number;
  dataLimite?: string;
  contaDestinoId?: string;
  imagem?: string;
}

export interface AtualizarMetaFinanceiraDTO {
  titulo?: string;
  descricao?: string;
  tipo?: TipoMetaFinanceira;
  valorObjetivo?: number;
  valorAtual?: number;
  dataLimite?: string;
  contaDestinoId?: string;
  status?: StatusMetaFinanceira;
  imagem?: string;
}
