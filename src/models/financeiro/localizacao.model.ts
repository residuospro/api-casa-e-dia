export interface Localizacao {
  id: string;
  nomeLocal: string | null;
  latitude: number;
  longitude: number;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  criadoEm: Date;
}

export interface CriarLocalizacaoDTO {
  nomeLocal?: string;
  latitude: number;
  longitude: number;
  endereco?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
}
