import { TipoTarefa, Categoria, ModoDistribuicao, StatusExecucao, FrequenciaRecorrencia } from './enums';

export interface Recorrencia {
  frequencia: FrequenciaRecorrencia;
  horarios: string[];
  dataInicio?: string | Date;
  dataFim?: string | Date | null;
}

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
  recorrencia: Recorrencia | null;
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
  iteracao?: number | null;
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
  atribuirAutomaticamente?: boolean;
  pontos?: number;
  criadoPorId: string;
  cicloIteracao?: number | null;
  recorrencia?: Recorrencia | null;
  execucoes?: CriarExecucaoDTO[] | null;
}

export interface AtualizarExecucaoDTO {
  id?: string;
  data: Date | string;
  status?: StatusExecucao;
  pontosObtidos?: number | null;
  iteracao?: number | null;
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
  recorrencia?: Recorrencia | null;
  execucoes?: AtualizarExecucaoDTO[] | null;
}

export interface ConcluirTarefaDTO {
  execucaoId: string;
}
