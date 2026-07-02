import { z } from 'zod';
import { TipoTarefa, Categoria, ModoDistribuicao } from '../models/enums';

const agendamentoSchema = z.object({
  diaSemana: z.number().int().min(0).max(6).nullable(),
  horario: z.string(),
});

export const criarTarefaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().nullable().optional(),
  tipo: z.nativeEnum(TipoTarefa),
  categoria: z.nativeEnum(Categoria),
  modoDistribuicao: z.nativeEnum(ModoDistribuicao).nullable().optional(),
  responsavelAtualId: z.string().nullable().optional(),
  pontos: z.number().int().min(0).default(0),
  cicloId: z.string().nullable().optional(),
  agendamentos: z.array(agendamentoSchema).nullable().optional(),
});

export const atualizarTarefaSchema = z.object({
  titulo: z.string().min(1).nullable().optional(),
  descricao: z.string().nullable().optional(),
  tipo: z.nativeEnum(TipoTarefa).nullable().optional(),
  categoria: z.nativeEnum(Categoria).nullable().optional(),
  modoDistribuicao: z.nativeEnum(ModoDistribuicao).nullable().optional(),
  responsavelAtualId: z.string().nullable().optional(),
  pontos: z.number().int().min(0).nullable().optional(),
  ativo: z.boolean().nullable().optional(),
  cicloId: z.string().nullable().optional(),
  agendamentos: z.array(agendamentoSchema).nullable().optional(),
});

export const concluirTarefaSchema = z.object({
  observacao: z.string().nullable().optional(),
});

export const rankingQuerySchema = z.object({
  familiaId: z.string().min(1),
});
