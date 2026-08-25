import { z } from 'zod';
import {
  TipoConta,
  Moeda,
  TipoCartao,
  TipoCategoriaFinanceira,
  StatusCategoria,
  TipoLancamento,
  StatusLancamento,
  OrigemLancamento,
  FormaPagamento,
} from '../models/enums';

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

// ========== LANCAMENTOS ==========

const dataValida = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Data invalida' });

const idOpcional = z.string().min(1).nullable().optional();

function listaCsv(schema: z.ZodTypeAny) {
  return z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === '') return undefined;
      if (Array.isArray(v)) return v;
      return String(v)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    },
    z.array(schema).optional(),
  );
}

export const criarLancamentoSchema = z.object({
  tipo: z.nativeEnum(TipoLancamento),
  titulo: z.string().min(1, 'Titulo e obrigatorio').max(150, 'Titulo muito longo'),
  descricao: z.string().max(500, 'Descricao muito longa').nullable().optional(),
  valor: z.number({ invalid_type_error: 'Valor deve ser um numero' }),
  moeda: z.nativeEnum(Moeda).optional(),
  categoriaId: idOpcional,
  subcategoriaId: idOpcional,
  centroCustoId: idOpcional,
  contaOrigemId: z.string().min(1, 'Conta de origem e obrigatoria'),
  contaDestinoId: idOpcional,
  cartaoId: idOpcional,
  formaPagamento: z.nativeEnum(FormaPagamento).nullable().optional(),
  dataHora: dataValida,
  observacoes: z.string().max(1000, 'Observacoes muito longas').nullable().optional(),
  responsavelId: z.string().min(1, 'Responsavel e obrigatorio'),
  localizacao: z.string().max(255, 'Localizacao muito longa').nullable().optional(),
  tagsIds: z.array(z.string().min(1)).max(20, 'Maximo de 20 tags').optional(),
});

export const atualizarLancamentoSchema = z.object({
  tipo: z.nativeEnum(TipoLancamento).optional(),
  titulo: z.string().min(1, 'Titulo e obrigatorio').max(150, 'Titulo muito longo').optional(),
  descricao: z.string().max(500, 'Descricao muito longa').nullable().optional(),
  valor: z.number({ invalid_type_error: 'Valor deve ser um numero' }).optional(),
  moeda: z.nativeEnum(Moeda).optional(),
  categoriaId: idOpcional,
  subcategoriaId: idOpcional,
  centroCustoId: idOpcional,
  contaOrigemId: z.string().min(1).optional(),
  contaDestinoId: idOpcional,
  cartaoId: idOpcional,
  formaPagamento: z.nativeEnum(FormaPagamento).nullable().optional(),
  dataHora: dataValida.optional(),
  observacoes: z.string().max(1000, 'Observacoes muito longas').nullable().optional(),
  responsavelId: z.string().min(1).optional(),
  localizacao: z.string().max(255, 'Localizacao muito longa').nullable().optional(),
  tagsIds: z.array(z.string().min(1)).max(20, 'Maximo de 20 tags').optional(),
});

export const alterarStatusLancamentoSchema = z.object({
  status: z.nativeEnum(StatusLancamento),
});

export const filtrosLancamentoQuerySchema = z.object({
  inicio: dataValida.optional(),
  fim: dataValida.optional(),
  tipo: listaCsv(z.nativeEnum(TipoLancamento)),
  status: listaCsv(z.nativeEnum(StatusLancamento)),
  categoriaId: listaCsv(z.string()),
  subcategoriaId: listaCsv(z.string()),
  centroCustoId: listaCsv(z.string()),
  contaId: listaCsv(z.string()),
  cartaoId: listaCsv(z.string()),
  responsavelId: listaCsv(z.string()),
  origem: listaCsv(z.nativeEnum(OrigemLancamento)),
  formaPagamento: listaCsv(z.nativeEnum(FormaPagamento)),
  valorMinimo: z.coerce.number().optional(),
  valorMaximo: z.coerce.number().optional(),
  busca: z.string().optional(),
  tagsIds: listaCsv(z.string()),
});

export const periodoQuerySchema = z
  .object({
    inicio: dataValida,
    fim: dataValida,
  })
  .refine((v) => Date.parse(v.inicio) <= Date.parse(v.fim), {
    message: 'Periodo inicial deve ser menor ou igual ao final',
    path: ['inicio'],
  });

export const agrupamentoPeriodoQuerySchema = periodoQuerySchema.and(
  z.object({
    granularidade: z.enum(['DIA', 'SEMANA', 'MES']).default('DIA'),
  }),
);
