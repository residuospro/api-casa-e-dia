import { TipoTarefa, Categoria, ModoDistribuicao } from './enums';

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
  criadoEm: Date;
  atualizadoEm: Date;
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
  agendamentos?: {
    diaSemana: number | null;
    horario: string;
  }[] | null;
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
  agendamentos?: {
    diaSemana: number | null;
    horario: string;
  }[] | null;
}

export interface ConcluirTarefaDTO {
  tarefaId: string;
  membroId: string;
  observacao?: string | null;
}
