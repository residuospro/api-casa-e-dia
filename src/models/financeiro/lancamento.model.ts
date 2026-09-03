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
  localizacao: string | null;
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
  descricao?: string | null;
  valor: number;
  moeda?: Moeda;
  categoriaId?: string | null;
  subcategoriaId?: string | null;
  centroCustoId?: string | null;
  contaOrigemId: string;
  contaDestinoId?: string | null;
  cartaoId?: string | null;
  formaPagamento?: FormaPagamento | null;
  dataHora: string;
  observacoes?: string | null;
  responsavelId: string;
  localizacao?: string | null;
  tagsIds?: string[];
  status?: StatusLancamento;
}

export interface AtualizarLancamentoDTO {
  tipo?: TipoLancamento;
  titulo?: string;
  descricao?: string | null;
  valor?: number;
  moeda?: Moeda;
  categoriaId?: string | null;
  subcategoriaId?: string | null;
  centroCustoId?: string | null;
  contaOrigemId?: string;
  contaDestinoId?: string | null;
  cartaoId?: string | null;
  formaPagamento?: FormaPagamento | null;
  dataHora?: string;
  observacoes?: string | null;
  responsavelId?: string;
  localizacao?: string | null;
  tagsIds?: string[];
  status?: StatusLancamento;
}

export interface AlterarStatusLancamentoDTO {
  status: StatusLancamento;
}

export type GranularidadePeriodo = 'DIA' | 'SEMANA' | 'MES';

export interface FiltrosLancamento {
  inicio?: string;
  fim?: string;
  tipo?: TipoLancamento[];
  status?: StatusLancamento[];
  categoriaId?: string[];
  subcategoriaId?: string[];
  centroCustoId?: string[];
  contaId?: string[];
  cartaoId?: string[];
  responsavelId?: string[];
  origem?: OrigemLancamento[];
  formaPagamento?: FormaPagamento[];
  valorMinimo?: number;
  valorMaximo?: number;
  busca?: string;
  tagsIds?: string[];
}
