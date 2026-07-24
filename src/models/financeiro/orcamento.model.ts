export interface Orcamento {
  id: string;
  familiaId: string;
  categoriaId: string;
  mes: number;
  ano: number;
  valorLimite: number;
  valorAtual: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarOrcamentoDTO {
  categoriaId: string;
  mes: number;
  ano: number;
  valorLimite: number;
}

export interface AtualizarOrcamentoDTO {
  valorLimite?: number;
}
