export interface Gamificacao {
  id: string;
  familiaId: string;
  nome: string;
  ativo: boolean;
  inicio: Date;
  fim: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
}
