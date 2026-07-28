export interface CentroCustoFinanceiro {
  id: string;
  familiaId: string;
  nome: string;
  icone: string | null;
  cor: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarCentroCustoFinanceiroDTO {
  nome: string;
  icone?: string | null;
  cor?: string | null;
}

export interface AtualizarCentroCustoFinanceiroDTO {
  nome?: string;
  icone?: string | null;
  cor?: string | null;
  ativo?: boolean;
}
