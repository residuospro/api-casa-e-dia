export interface HistoricoLancamento {
  id: string;
  lancamentoId: string;
  usuarioId: string;
  campo: string;
  valorAnterior: string | null;
  novoValor: string | null;
  criadoEm: Date;
}

export interface CriarHistoricoLancamentoDTO {
  lancamentoId: string;
  usuarioId: string;
  campo: string;
  valorAnterior?: string;
  novoValor?: string;
}
