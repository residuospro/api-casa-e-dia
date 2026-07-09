import { TipoTarefa, Categoria, ModoDistribuicao, StatusExecucao } from './enums';

export interface Tarefa {
  id: string;
  familiaId: string;
  cicloId: string | null;
  titulo: string;
  descricao: string | null;
  tipo: TipoTarefa;
  categoria: Categoria;
  modoDistribuicao: ModoDistribuicao | null;
  responsavelAtualId: string | null;
  pontos: number;
  ativo: boolean;
  criadoPorId: string;
  cicloIteracao: number | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CriarExecucaoDTO {
  id?: string;
  data: Date;
  status: StatusExecucao;
  pontosObtidos: number | null;
  concluidoPorId?: string | null;
  concluidoEm?: Date | null;
  notificacaoCriada?: boolean;
}

export interface CriarTarefaDTO {
  familiaId: string;
  cicloId?: string | null;
  titulo: string;
  descricao?: string | null;
  tipo: TipoTarefa;
  categoria: Categoria;
  modoDistribuicao?: ModoDistribuicao | null;
  responsavelAtualId?: string | null;
  pontos?: number;
  criadoPorId: string;
  cicloIteracao?: number | null;
  execucoes?: CriarExecucaoDTO[] | null;
}

export interface AtualizarExecucaoDTO {
  data: Date | string;
  status?: StatusExecucao;
  pontosObtidos?: number | null;
}

export interface AtualizarTarefaDTO {
  cicloId?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  tipo?: TipoTarefa | null;
  categoria?: Categoria | null;
  modoDistribuicao?: ModoDistribuicao | null;
  responsavelAtualId?: string | null;
  pontos?: number | null;
  ativo?: boolean | null;
  execucoes?: AtualizarExecucaoDTO[] | null;
}

export interface ConcluirTarefaDTO {
  execucaoId: string;
}
