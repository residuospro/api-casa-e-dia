import { z } from 'zod';
import {
  TipoTarefa,
  Categoria,
  ModoDistribuicao,
  StatusExecucao,
  FrequenciaRecorrencia,
} from '../models/enums';

const execucaoSchema = z.object({
  id: z.string().optional(),
  data: z.string().datetime().or(z.date()),
  status: z.nativeEnum(StatusExecucao).default(StatusExecucao.AGENDADA),
  pontosObtidos: z.number().int().nullable().default(null),
  concluidoPorId: z.string().nullable().optional(),
  concluidoEm: z.string().datetime().nullable().optional(),
  notificacaoCriada: z.boolean().optional(),
  iteracao: z.number().int().nullable().optional(),
  executorId: z.string().nullable().optional(),
});

const recorrenciaSchema = z.object({
  frequencia: z.nativeEnum(FrequenciaRecorrencia),
  horarios: z
    .array(z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve ter formato HH:mm'))
    .min(1, 'Pelo menos um horário é obrigatório'),
  dataInicio: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.date())
    .optional(),
  dataFim: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.date())
    .nullable()
    .optional(),
});

export const criarTarefaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().nullable().optional(),
  tipo: z.nativeEnum(TipoTarefa),
  categoria: z.nativeEnum(Categoria),
  modoDistribuicao: z.nativeEnum(ModoDistribuicao).nullable().optional(),
  responsavelAtualId: z.string().nullable().optional(),
  participantesId: z.array(z.string()).nullable().optional(),
  atribuirAutomaticamente: z.boolean().optional(),
  pontos: z.number().int().min(0).optional(),
  cicloId: z.string().nullable().optional(),
  recorrencia: recorrenciaSchema.nullable().optional(),
  execucoes: z.array(execucaoSchema).nullable().optional(),
});

export const atualizarTarefaSchema = z.object({
  titulo: z.string().min(1).nullable().optional(),
  descricao: z.string().nullable().optional(),
  tipo: z.nativeEnum(TipoTarefa).nullable().optional(),
  categoria: z.nativeEnum(Categoria).nullable().optional(),
  modoDistribuicao: z.nativeEnum(ModoDistribuicao).nullable().optional(),
  responsavelAtualId: z.string().nullable().optional(),
  participantesId: z.array(z.string()).nullable().optional(),
  pontos: z.number().int().min(0).nullable().optional(),
  ativo: z.boolean().nullable().optional(),
  cicloId: z.string().nullable().optional(),
  recorrencia: recorrenciaSchema.nullable().optional(),
  execucoes: z.array(execucaoSchema).nullable().optional(),
});

export const concluirTarefaSchema = z.object({
  execucaoId: z.string().min(1, 'execucaoId é obrigatório'),
});

export const rankingQuerySchema = z.object({
  familiaId: z.string().min(1),
});

export const concluirExecucaoSchema = z.object({
  concluidoPorId: z.string().min(1, 'concluidoPorId é obrigatório'),
});

export const atualizarExecucaoSchema = z.object({
  data: z.string().datetime({ message: 'Data inválida' }).optional(),
  executorId: z.string().nullable().optional(),
});
