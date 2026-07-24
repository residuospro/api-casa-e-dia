import { TipoCartao } from '../enums';

export interface Cartao {
  id: string;
  familiaId: string;
  contaId: string;
  nome: string;
  tipo: TipoCartao;
  bandeira: string | null;
  limite: number | null;
  fechamentoDia: number | null;
  vencimentoDia: number | null;
  melhorDiaCompra: number | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarCartaoDTO {
  contaId: string;
  nome: string;
  tipo?: TipoCartao;
  bandeira?: string;
  limite?: number;
  fechamentoDia?: number;
  vencimentoDia?: number;
  melhorDiaCompra?: number;
}

export interface AtualizarCartaoDTO {
  contaId?: string;
  nome?: string;
  tipo?: TipoCartao;
  bandeira?: string;
  limite?: number;
  fechamentoDia?: number;
  vencimentoDia?: number;
  melhorDiaCompra?: number;
  ativo?: boolean;
}
