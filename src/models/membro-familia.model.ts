import { TipoPessoa, Permissao, Genero } from './enums';

export interface MembroFamilia {
  id: string;
  usuarioId: string | null;
  familiaId: string;
  nome: string | null;
  fotoPerfil: string | null;
  genero: Genero | null;
  tipoPessoa: TipoPessoa;
  permissao: Permissao | null;
  dependente: boolean;
  conviteEnviado: boolean;
  criadoEm: Date;
}

export interface MembroFamiliaCriar {
  usuarioId?: string | null;
  familiaId: string;
  nome?: string | null;
  fotoPerfil?: string | null;
  genero?: Genero | null;
  tipoPessoa: TipoPessoa;
  permissao?: Permissao | null;
  dependente?: boolean;
}

export interface MembroFamiliaAtualizar {
  nome?: string;
  fotoPerfil?: string | null;
  genero?: Genero | null;
  tipoPessoa?: TipoPessoa;
  permissao?: Permissao | null;
}
