export interface Ciclo {
  id: string;
  familiaId: string;
  nome: string;
  descricao: string | null;
  duracaoDias: number;
  ativo: boolean;
  inicio: Date;
  proximaRenovacao: Date | null;
  renovadoEm: Date | null;
  participantes: string[];
  renovacaoAutomatica: boolean;
  revezamentoAutomatico: boolean;
  iteracao: number;
  expirado: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarCicloDTO {
  familiaId: string;
  nome: string;
  descricao?: string;
  duracaoDias: number;
  ativo?: boolean;
  participantes?: string[];
  renovacaoAutomatica?: boolean;
  revezamentoAutomatico?: boolean;
}

export interface AtualizarCicloDTO {
  nome?: string;
  descricao?: string;
  duracaoDias?: number;
  ativo?: boolean;
  inicio?: string;
  participantes?: string[];
  renovacaoAutomatica?: boolean;
  revezamentoAutomatico?: boolean;
}
