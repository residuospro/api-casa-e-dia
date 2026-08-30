import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import {
  CriarRecorrenciaFinanceiraDTO,
  AtualizarRecorrenciaFinanceiraDTO,
  FiltrosRecorrencia,
} from '../../models/financeiro/recorrencia-financeira.model';
import { ListagemOptions, buildWhereClause } from '../../helpers/listagem.helper';

type TxClient = Prisma.TransactionClient;

const lancamentoModeloSelect = {
  id: true,
  tipo: true,
  titulo: true,
  descricao: true,
  valor: true,
  moeda: true,
  categoriaId: true,
  subcategoriaId: true,
  centroCustoId: true,
  contaOrigemId: true,
  contaDestinoId: true,
  cartaoId: true,
  formaPagamento: true,
  observacoes: true,
  responsavelId: true,
  localizacao: true,
  criadoPorId: true,
};

const lancamentoModeloSelectComRelacoes = {
  ...lancamentoModeloSelect,
  categoria: { select: { id: true, nome: true, cor: true, icone: true } },
  subcategoria: { select: { id: true, nome: true } },
  centroCusto: { select: { id: true, nome: true, cor: true, icone: true } },
  contaOrigem: { select: { id: true, nome: true, cor: true, icone: true } },
  contaDestino: { select: { id: true, nome: true, cor: true, icone: true } },
  cartao: { select: { id: true, nome: true } },
  responsavel: {
    select: { id: true, nome: true, fotoPerfil: true },
  },
};

const recorrenciaDetalhadaInclude = {
  lancamentoModelo: { select: lancamentoModeloSelectComRelacoes },
  _count: { select: { lancamentos: true } },
};

function buildFiltrosWhere(
  familiaId: string,
  filtros: FiltrosRecorrencia,
): Record<string, unknown> {
  const where: Record<string, unknown> = { familiaId };

  if (filtros.ativa !== undefined) where.ativa = filtros.ativa;
  if (filtros.frequencia?.length) where.frequencia = { in: filtros.frequencia };

  return where;
}

function buildListagemWhere(familiaId: string, options: ListagemOptions): Record<string, unknown> {
  return buildWhereClause({ familiaId }, options.filtro ?? {});
}

export const recorrenciaFinanceiraRepository = {
  createIn(tx: TxClient, familiaId: string, dados: CriarRecorrenciaFinanceiraDTO) {
    return tx.recorrenciaFinanceira.create({
      data: {
        familiaId,
        lancamentoModeloId: dados.lancamentoModeloId,
        titulo: dados.titulo,
        frequencia: dados.frequencia,
        intervalo: dados.intervalo ?? 1,
        proximaExecucao: new Date(dados.proximaExecucao),
      },
    });
  },

  create(familiaId: string, dados: CriarRecorrenciaFinanceiraDTO) {
    return prisma.recorrenciaFinanceira.create({
      data: {
        familiaId,
        lancamentoModeloId: dados.lancamentoModeloId,
        titulo: dados.titulo,
        frequencia: dados.frequencia,
        intervalo: dados.intervalo ?? 1,
        proximaExecucao: new Date(dados.proximaExecucao),
      },
    });
  },

  findById(id: string) {
    return prisma.recorrenciaFinanceira.findUnique({ where: { id } });
  },

  findDetalhada(id: string) {
    return prisma.recorrenciaFinanceira.findUnique({
      where: { id },
      include: recorrenciaDetalhadaInclude,
    });
  },

  findComModelo(id: string) {
    return prisma.recorrenciaFinanceira.findUnique({
      where: { id },
      include: {
        lancamentoModelo: { select: lancamentoModeloSelectComRelacoes },
      },
    });
  },

  findByLancamentoModeloId(lancamentoModeloId: string) {
    return prisma.recorrenciaFinanceira.findUnique({ where: { lancamentoModeloId } });
  },

  async findByFamiliaComFiltros(
    familiaId: string,
    filtros: FiltrosRecorrencia,
    options: ListagemOptions,
  ) {
    const where = buildFiltrosWhere(familiaId, filtros);
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.recorrenciaFinanceira.findMany({
        where,
        orderBy: [{ proximaExecucao: 'asc' }],
        skip,
        take: options.porPagina,
        include: {
          lancamentoModelo: { select: lancamentoModeloSelectComRelacoes },
          _count: { select: { lancamentos: true } },
        },
      }),
      prisma.recorrenciaFinanceira.count({ where }),
    ]);

    return { data, total };
  },

  findByFamilia(familiaId: string) {
    return prisma.recorrenciaFinanceira.findMany({ where: { familiaId } });
  },

  findPendentes(agora: Date) {
    return prisma.recorrenciaFinanceira.findMany({
      where: {
        ativa: true,
        proximaExecucao: { lte: agora },
      },
      include: {
        lancamentoModelo: { select: lancamentoModeloSelectComRelacoes },
      },
      orderBy: { proximaExecucao: 'asc' },
    });
  },

  existsOcorrenciaIn(tx: TxClient, recorrenciaId: string, dataHora: Date) {
    return tx.lancamento.findFirst({
      where: { recorrenciaId, dataHora },
      select: { id: true },
    });
  },

  updateIn(tx: TxClient, id: string, dados: Prisma.RecorrenciaFinanceiraUncheckedUpdateInput) {
    return tx.recorrenciaFinanceira.update({ where: { id }, data: dados });
  },

  update(id: string, dados: AtualizarRecorrenciaFinanceiraDTO) {
    return prisma.recorrenciaFinanceira.update({ where: { id }, data: dados });
  },

  delete(id: string) {
    return prisma.recorrenciaFinanceira.delete({ where: { id } });
  },

  async listarOcorrencias(familiaId: string, recorrenciaId: string, options: ListagemOptions) {
    const where = buildListagemWhere(familiaId, options);
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.lancamento.findMany({
        where: { ...where, recorrenciaId },
        orderBy: [{ dataHora: 'desc' }],
        skip,
        take: options.porPagina,
        include: {
          categoria: { select: { id: true, nome: true, cor: true, icone: true } },
          contaOrigem: { select: { id: true, nome: true, cor: true, icone: true } },
          contaDestino: { select: { id: true, nome: true, cor: true, icone: true } },
          cartao: { select: { id: true, nome: true } },
          responsavel: {
            select: { id: true, nome: true, fotoPerfil: true },
          },
        },
      }),
      prisma.lancamento.count({ where: { ...where, recorrenciaId } }),
    ]);

    return { data, total };
  },
};
