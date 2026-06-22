import { Genero } from './enums';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  celular?: string | null;
  fotoPerfil?: string | null;
  genero?: Genero | null;
  primeiroAcesso: boolean;
  tokenPrimeiroAcesso?: string | null;
  tokenExpiraEm?: Date | null;
  criadoEm: Date;
}

export interface UsuarioComSenha extends Usuario {
  senha: string;
}

export interface UsuarioCriar {
  nome: string;
  email: string;
  senha: string;
  celular?: string;
  fotoPerfil?: string;
  genero?: Genero;
  primeiroAcesso?: boolean;
  tokenPrimeiroAcesso?: string;
  tokenExpiraEm?: Date;
}
