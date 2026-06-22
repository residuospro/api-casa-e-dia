import { NotificacaoTipo } from './enums';

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: NotificacaoTipo;
  lido: boolean;
  titulo: string;
  mensagem: string;
  dados: string | null;
  criadoEm: Date;
}

export interface NotificacaoCriar {
  usuarioId: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  dados?: string | null;
}
