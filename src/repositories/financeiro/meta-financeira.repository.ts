import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import {
  AtualizarMetaFinanceiraDTO,
  CriarMetaFinanceiraDTO,
  FiltrosMetaFinanceira,
} from '../../models/financeiro/meta-financeira.model';
import { StatusMetaFinanceira, TipoMovimentacaoMeta } from '../../models/enums';
import { ListagemOptions, buildOrderBy } from '../../helpers/listagem.helper';

type TxClient = Prisma.TransactionClient;

const contaDestinoSelect = { select: { id: true, nome: true, cor: true, icone: true } };

const metaInclude = {
  contaDestino: contaDestinoSelect,
};

export interface CriarMovimentacaoMetaFinanceiraDTO {
  metaFinanceiraId: string;
  usuarioId: string;
  tipo: TipoMovimentacaoMeta;
  valor: number;
  saldoAnterior: number;
  saldoNovo: number;
  observacao?: string | null;
}

export const metaFinanceiraRepository = {
  create(familiaId: string, data: CriarMetaFinanceiraDTO) {
    return prisma.metaFinanceira.create({
      data: {
        familiaId,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        tipo: data.tipo ?? 'OBJETIVO',
        valorObjetivo: data.valorObjetivo,
        valorAtual: 0,
        dataLimite: data.dataLimite ? new Date(data.dataLimite) : null,
        contaDestinoId: data.contaDestinoId ?? null,
        imagem: data.imagem ?? null,
      },
    });
  },

  findById(id: string) {
    return prisma.metaFinanceira.findUnique({ where: { id }, include: metaInclude });
  },

  async findByFamiliaWithFilters(
    familiaId: string,
    filtros: FiltrosMetaFinanceira,
    options: ListagemOptions,
  ) {
    const where: Record<string, unknown> = { familiaId };

    if (filtros.status?.length) where.status = { in: filtros.status };
    if (filtros.tipo?.length) where.tipo = { in: filtros.tipo };
    if (filtros.busca) {
      where.OR = [
        { titulo: { contains: filtros.busca, mode: 'insensitive' } },
        { descricao: { contains: filtros.busca, mode: 'insensitive' } },
      ];
    }

    const orderBy = buildOrderBy(options.ordenacao, 'criadoEm');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.metaFinanceira.findMany({ where, orderBy, skip, take: options.porPagina, include: metaInclude }),
      prisma.metaFinanceira.count({ where }),
    ]);

    return { data, total };
  },

  findByFamiliaStatusIn(
    familiaId: string,
    statuses: StatusMetaFinanceira[],
    take?: number,
  ) {
    return prisma.metaFinanceira.findMany({
      where: { familiaId, status: { in: statuses } },
      orderBy: { atualizadoEm: 'desc' },
      include: metaInclude,
      take,
    });
  },

  countByStatus(familiaId: string) {
    return prisma.metaFinanceira.groupBy({
      by: ['status'],
      where: { familiaId },
      _count: { _all: true },
    });
  },

  update(id: string, data: AtualizarMetaFinanceiraDTO) {
    const updateData: Prisma.MetaFinanceiraUncheckedUpdateInput = {};
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.valorObjetivo !== undefined) updateData.valorObjetivo = data.valorObjetivo;
    if (data.dataLimite !== undefined) {
      updateData.dataLimite = data.dataLimite === null ? null : new Date(data.dataLimite);
    }
    if (data.contaDestinoId !== undefined) updateData.contaDestinoId = data.contaDestinoId;
    if (data.imagem !== undefined) updateData.imagem = data.imagem;
    return prisma.metaFinanceira.update({ where: { id }, data: updateData });
  },

  updateStatus(id: string, status: StatusMetaFinanceira) {
    return prisma.metaFinanceira.update({ where: { id }, data: { status } });
  },

  delete(id: string) {
    return prisma.metaFinanceira.delete({ where: { id } });
  },

  updateValorAndStatusIn(
    tx: TxClient,
    metaId: string,
    valorAtual: number,
    status: StatusMetaFinanceira,
  ) {
    return tx.metaFinanceira.update({
      where: { id: metaId },
      data: { valorAtual, status },
    });
  },

  createMovimentacaoIn(tx: TxClient, data: CriarMovimentacaoMetaFinanceiraDTO) {
    return tx.historicoMetaFinanceira.create({ data });
  },

  async findMovimentacoes(metaFinanceiraId: string, options: ListagemOptions) {
    const where = { metaFinanceiraId };
    const orderBy = buildOrderBy(options.ordenacao, 'criadoEm');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.historicoMetaFinanceira.findMany({
        where,
        orderBy,
        skip,
        take: options.porPagina,
        include: { usuario: { select: { id: true, nome: true, fotoPerfil: true } } },
      }),
      prisma.historicoMetaFinanceira.count({ where }),
    ]);

    return { data, total };
  },
};