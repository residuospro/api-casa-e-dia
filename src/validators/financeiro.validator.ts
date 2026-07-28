import { z } from 'zod';
import { TipoConta, Moeda, TipoCartao, TipoCategoriaFinanceira, StatusCategoria } from '../models/enums';

export const criarContaSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  instituicao: z.string().max(100, 'Instituicao muito longa').nullable().optional(),
  tipo: z.nativeEnum(TipoConta),
  moeda: z.nativeEnum(Moeda).optional(),
  saldoInicial: z.number().min(0, 'Saldo inicial deve ser positivo').optional(),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
  icone: z.string().max(50, 'Icone muito longo').nullable().optional(),
});

export const atualizarContaSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo').optional(),
  instituicao: z.string().max(100, 'Instituicao muito longa').nullable().optional(),
  tipo: z.nativeEnum(TipoConta).optional(),
  moeda: z.nativeEnum(Moeda).optional(),
  saldoInicial: z.number().min(0, 'Saldo inicial deve ser positivo').optional(),
  saldoAtual: z.number().optional(),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
  icone: z.string().max(50, 'Icone muito longo').nullable().optional(),
  ativo: z.boolean().optional(),
});

export const criarCartaoSchema = z.object({
  contaId: z.string().min(1, 'Conta e obrigatoria'),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  tipo: z.nativeEnum(TipoCartao).optional(),
  bandeira: z.string().max(50, 'Bandeira muito longa').nullable().optional(),
  limite: z.number().min(0, 'Limite deve ser positivo').nullable().optional(),
  fechamentoDia: z.number().int().min(1, 'Dia invalido').max(31, 'Dia invalido').nullable().optional(),
  vencimentoDia: z.number().int().min(1, 'Dia invalido').max(31, 'Dia invalido').nullable().optional(),
  melhorDiaCompra: z.number().int().min(1, 'Dia invalido').max(31, 'Dia invalido').nullable().optional(),
});

export const atualizarCartaoSchema = z.object({
  contaId: z.string().min(1, 'Conta e obrigatoria').optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo').optional(),
  tipo: z.nativeEnum(TipoCartao).optional(),
  bandeira: z.string().max(50, 'Bandeira muito longa').nullable().optional(),
  limite: z.number().min(0, 'Limite deve ser positivo').nullable().optional(),
  fechamentoDia: z.number().int().min(1, 'Dia invalido').max(31, 'Dia invalido').nullable().optional(),
  vencimentoDia: z.number().int().min(1, 'Dia invalido').max(31, 'Dia invalido').nullable().optional(),
  melhorDiaCompra: z.number().int().min(1, 'Dia invalido').max(31, 'Dia invalido').nullable().optional(),
  ativo: z.boolean().optional(),
});

export const criarCategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
  icone: z.string().max(50, 'Icone muito longo').nullable().optional(),
  tipo: z.nativeEnum(TipoCategoriaFinanceira),
});

export const atualizarCategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo').optional(),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
  icone: z.string().max(50, 'Icone muito longo').nullable().optional(),
  tipo: z.nativeEnum(TipoCategoriaFinanceira).optional(),
  status: z.nativeEnum(StatusCategoria).optional(),
});

export const criarSubcategoriaSchema = z.object({
  categoriaId: z.string().min(1, 'Categoria e obrigatoria'),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
});

export const atualizarSubcategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo').optional(),
  ativo: z.boolean().optional(),
});

export const criarCentroCustoSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
  icone: z.string().max(50, 'Icone muito longo').nullable().optional(),
});

export const atualizarCentroCustoSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo').optional(),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
  icone: z.string().max(50, 'Icone muito longo').nullable().optional(),
  ativo: z.boolean().optional(),
});

export const criarTagSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(50, 'Nome muito longo'),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
});

export const atualizarTagSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(50, 'Nome muito longo').optional(),
  cor: z.string().max(7, 'Cor invalida').nullable().optional(),
});
