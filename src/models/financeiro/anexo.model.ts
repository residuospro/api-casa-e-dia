export interface Anexo {
  id: string;
  lancamentoId: string;
  url: string;
  nomeArquivo: string | null;
  mimeType: string | null;
  tamanho: number | null;
  criadoEm: Date;
}

export interface CriarAnexoDTO {
  url: string;
  nomeArquivo?: string;
  mimeType?: string;
  tamanho?: number;
}
