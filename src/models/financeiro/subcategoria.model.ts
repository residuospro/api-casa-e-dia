export interface Subcategoria {
  id: string;
  categoriaId: string;
  nome: string;
  ativo: boolean;
  criadoEm: Date;
}

export interface CriarSubcategoriaDTO {
  nome: string;
}

export interface AtualizarSubcategoriaDTO {
  nome?: string;
  ativo?: boolean;
}
