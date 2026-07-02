export interface Ciclo {
  id: string;
  familiaId: string;
  nome: string;
  descricao: string | null;
  duracaoDias: number;
  ativo: boolean;
  inicio: Date;
  ultimaRotacao: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarCicloDTO {
  familiaId: string;
  nome: string;
  descricao?: string;
  duracaoDias: number;
  ativo?: boolean;
}

export interface AtualizarCicloDTO {
  nome?: string;
  descricao?: string;
  duracaoDias?: number;
  ativo?: boolean;
  inicio?: string;
}
