export interface Tag {
  id: string;
  familiaId: string;
  nome: string;
  cor: string | null;
  criadoEm: Date;
}

export interface CriarTagDTO {
  nome: string;
  cor?: string;
}

export interface AtualizarTagDTO {
  nome?: string;
  cor?: string;
}

export interface LancamentoTag {
  id: string;
  lancamentoId: string;
  tagId: string;
  criadoEm: Date;
}

export interface CriarLancamentoTagDTO {
  tagId: string;
}
