import { TipoConta, Moeda } from '../enums';

export interface Conta {
  id: string;
  familiaId: string;
  nome: string;
  instituicao: string | null;
  tipo: TipoConta;
  moeda: Moeda;
  saldoInicial: number;
  saldoAtual: number;
  saldoPrevisto: number;
  cor: string | null;
  icone: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarContaDTO {
  nome: string;
  instituicao?: string | null;
  tipo: TipoConta;
  moeda?: Moeda;
  saldoInicial?: number;
  cor?: string | null;
  icone?: string | null;
}

export interface AtualizarContaDTO {
  nome?: string;
  instituicao?: string | null;
  tipo?: TipoConta;
  moeda?: Moeda;
  saldoInicial?: number;
  saldoAtual?: number;
  cor?: string | null;
  icone?: string | null;
  ativo?: boolean;
}
