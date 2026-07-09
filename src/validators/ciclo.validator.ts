import { z } from 'zod';

export const criarCicloSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  duracaoDias: z.number().int().positive('Duração deve ser um número positivo'),
  ativo: z.boolean().optional(),
  participantes: z.array(z.string()).optional(),
  renovacaoAutomatica: z.boolean().optional(),
  revezamentoAutomatico: z.boolean().optional(),
});

export const atualizarCicloSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  descricao: z.string().optional(),
  duracaoDias: z.number().int().positive('Duração deve ser um número positivo').optional(),
  ativo: z.boolean().optional(),
  inicio: z.string().optional(),
  participantes: z.array(z.string()).optional(),
  renovacaoAutomatica: z.boolean().optional(),
  revezamentoAutomatico: z.boolean().optional(),
});
