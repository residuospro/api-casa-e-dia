import { TipoLancamento, StatusLancamento, OrigemLancamento, FormaPagamento, Moeda } from '../enums';

export interface Lancamento {
  id: string;
  familiaId: string;
  criadoPorId: string;
  responsavelId: string;
  tipo: TipoLancamento;
  titulo: string;
  descricao: string | null;
  valor: number;
  moeda: Moeda;
  categoriaId: string | null;
  subcategoriaId: string | null;
  centroCustoId: string | null;
  contaOrigemId: string;
  contaDestinoId: string | null;
  cartaoId: string | null;
  formaPagamento: FormaPagamento | null;
  dataHora: Date;
  observacoes: string | null;
  status: StatusLancamento;
  origem: OrigemLancamento;
  confirmadoPeloUsuario: boolean;
  observacaoIA: string | null;
  confiancaIA: number | null;
  localizacaoId: string | null;
  recorrenciaId: string | null;
  parcelamentoId: string | null;
  numeroParcela: number | null;
  quantidadeParcelas: number | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarLancamentoDTO {
  tipo: TipoLancamento;
  titulo: string;
  descricao?: string;
  valor: number;
  moeda?: Moeda;
  categoriaId?: string;
  subcategoriaId?: string;
  centroCustoId?: string;
  contaOrigemId: string;
  contaDestinoId?: string;
  cartaoId?: string;
  formaPagamento?: FormaPagamento;
  dataHora: string;
  observacoes?: string;
  responsavelId: string;
  localizacaoId?: string;
  recorrenciaId?: string;
  parcelamentoId?: string;
  numeroParcela?: number;
  quantidadeParcelas?: number;
}

export interface AtualizarLancamentoDTO {
  tipo?: TipoLancamento;
  titulo?: string;
  descricao?: string;
  valor?: number;
  moeda?: Moeda;
  categoriaId?: string;
  subcategoriaId?: string;
  centroCustoId?: string;
  contaOrigemId?: string;
  contaDestinoId?: string;
  cartaoId?: string;
  formaPagamento?: FormaPagamento;
  dataHora?: string;
  observacoes?: string;
  responsavelId?: string;
  status?: StatusLancamento;
  localizacaoId?: string;
}
