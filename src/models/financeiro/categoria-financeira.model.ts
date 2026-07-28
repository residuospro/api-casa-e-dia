import { TipoCategoriaFinanceira, StatusCategoria } from '../enums';

export interface CategoriaFinanceira {
  id: string;
  familiaId: string;
  nome: string;
  icone: string | null;
  cor: string | null;
  tipo: TipoCategoriaFinanceira;
  status: StatusCategoria;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarCategoriaFinanceiraDTO {
  nome: string;
  icone?: string | null;
  cor?: string | null;
  tipo: TipoCategoriaFinanceira;
}

export interface AtualizarCategoriaFinanceiraDTO {
  nome?: string;
  icone?: string | null;
  cor?: string | null;
  tipo?: TipoCategoriaFinanceira;
  status?: StatusCategoria;
}
