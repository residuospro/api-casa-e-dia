import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import { CriarOrcamentoDTO, AtualizarOrcamentoDTO } from '../../models/financeiro/orcamento.model';
import { ListagemOptions } from '../../helpers/listagem.helper';
import { StatusLancamento, TipoLancamento } from '../../models/enums';

type TxClient = Prisma.TransactionClient;

const orcamentoInclude = {
  categoria: { select: { id: true, nome: true, cor: true, icone: true, tipo: true } },
  conta: { select: { id: true, nome: true, cor: true, icone: true } },
};

const COLUNAS_ORDENACAO = ['ano', 'mes', 'valorLimite', 'valorAtual', 'criadoEm'] as const;

function buildOrdenacao(ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
  if (ordenacao && ordenacao.length > 0) {
    const validas = ordenacao
      .filter((o) => (COLUNAS_ORDENACAO as readonly string[]).includes(o.coluna))
      .map((o) => ({ [o.coluna]: o.direcao }));
    if (validas.length > 0) return validas;
  }
  const ORDER_PADRAO = [{ ano: 'desc' }, { mes: 'desc' }] as const;
  return ORDER_PADRAO as unknown as { ano: 'desc'; mes: 'desc' }[];
}

export const orcamentoRepository = {
  createIn(tx: TxClient, familiaId: string, data: CriarOrcamentoDTO) {
    return tx.orcamento.create({
      data: {
        familiaId,
        categoriaId: data.categoriaId,
        contaId: data.contaId,
        mes: data.mes,
        ano: data.ano,
        valorLimite: data.valorLimite,
        valorAtual: 0,
      },
      include: orcamentoInclude,
    });
  },

  findById(id: string) {
    return prisma.orcamento.findUnique({ where: { id }, include: orcamentoInclude });
  },

  findUniqueKey(familiaId: string, categoriaId: string, mes: number, ano: number) {
    return prisma.orcamento.findUnique({
      where: { familiaId_categoriaId_mes_ano: { familiaId, categoriaId, mes, ano } },
      include: orcamentoInclude,
    });
  },

  findUniqueKeyIn(tx: TxClient, familiaId: string, categoriaId: string, mes: number, ano: number) {
    return tx.orcamento.findUnique({
      where: { familiaId_categoriaId_mes_ano: { familiaId, categoriaId, mes, ano } },
      select: { id: true },
    });
  },

  async findByFamiliaWithFilters(
    familiaId: string,
    filtros: { mes?: number; ano?: number; categoriaId?: string; busca?: string },
    options: ListagemOptions,
  ) {
    const where: Record<string, unknown> = { familiaId };

    if (filtros.mes !== undefined) where.mes = filtros.mes;
    if (filtros.ano !== undefined) where.ano = filtros.ano;
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
    if (filtros.busca) {
      where.categoria = { nome: { contains: filtros.busca, mode: 'insensitive' } };
    }

    const orderBy = buildOrdenacao(options.ordenacao);
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.orcamento.findMany({
        where,
        orderBy,
        skip,
        take: options.porPagina,
        include: orcamentoInclude,
      }),
      prisma.orcamento.count({ where }),
    ]);

    return { data, total };
  },

  findAllByFamilia(familiaId: string, filtros: { mes?: number; ano?: number; categoriaId?: string; busca?: string }) {
    const where: Record<string, unknown> = { familiaId };

    if (filtros.mes !== undefined) where.mes = filtros.mes;
    if (filtros.ano !== undefined) where.ano = filtros.ano;
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
    if (filtros.busca) {
      where.categoria = { nome: { contains: filtros.busca, mode: 'insensitive' } };
    }

    return prisma.orcamento.findMany({ where, include: orcamentoInclude });
  },

  findByFamiliaMesAno(familiaId: string, mes: number, ano: number) {
    return prisma.orcamento.findMany({
      where: { familiaId, mes, ano },
      include: orcamentoInclude,
      orderBy: { categoria: { nome: 'asc' } },
    });
  },

  updateIn(tx: TxClient, id: string, data: AtualizarOrcamentoDTO) {
    const updateData: Prisma.OrcamentoUncheckedUpdateInput = {};
    if (data.valorLimite !== undefined) updateData.valorLimite = data.valorLimite;
    if (data.contaId !== undefined) updateData.contaId = data.contaId;
    return tx.orcamento.update({ where: { id }, data: updateData, include: orcamentoInclude });
  },

  deleteIn(tx: TxClient, id: string) {
    return tx.orcamento.delete({ where: { id } });
  },

  updateValorAtualIn(tx: TxClient, id: string, valorAtual: number) {
    return tx.orcamento.update({ where: { id }, data: { valorAtual } });
  },

  desvincularLancamentosIn(tx: TxClient, orcamentoId: string) {
    return tx.lancamento.updateMany({ where: { orcamentoId }, data: { orcamentoId: null } });
  },

  vincularLancamentosIn(tx: TxClient, orcamentoId: string, lancamentoIds: string[]) {
    if (!lancamentoIds.length) return Promise.resolve({ count: 0 });
    return tx.lancamento.updateMany({ where: { id: { in: lancamentoIds } }, data: { orcamentoId } });
  },

  listConsumoByOrcamentoIn(tx: TxClient, orcamentoId: string) {
    return tx.lancamento.findMany({
      where: { orcamentoId, status: { in: [StatusLancamento.PAGO, StatusLancamento.PENDENTE, StatusLancamento.RECEBIDO] } },
      select: { id: true, valor: true, status: true, contaOrigemId: true, cartaoId: true, formaPagamento: true },
    });
  },

  sumConsumoIn(tx: TxClient, orcamentoId: string) {
    return tx.lancamento.aggregate({
      where: { orcamentoId, status: { in: [StatusLancamento.PAGO, StatusLancamento.PENDENTE, StatusLancamento.RECEBIDO] } },
      _sum: { valor: true },
    });
  },

  sumPagoByOrcamentoIn(tx: TxClient, orcamentoId: string) {
    return tx.lancamento.aggregate({
      where: { orcamentoId, status: StatusLancamento.PAGO },
      _sum: { valor: true },
    });
  },
};