import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import {
  AlterarStatusLancamentoDTO,
  AtualizarLancamentoDTO,
  CriarLancamentoDTO,
  FiltrosLancamento,
  GranularidadePeriodo,
} from '../../models/financeiro/lancamento.model';
import { ListagemOptions } from '../../helpers/listagem.helper';
import { StatusLancamento, TipoLancamento, OrigemLancamento } from '../../models/enums';

type TxClient = Prisma.TransactionClient;

export interface DeltaSaldo {
  contaId: string;
  campo: 'saldoAtual' | 'saldoPrevisto';
  delta: number;
}

export interface RegistroHistorico {
  lancamentoId: string;
  usuarioId: string;
  campo: string;
  valorAnterior?: string | null;
  novoValor?: string | null;
}

const lancamentoIncludeListagem = {
  categoria: { select: { id: true, nome: true, cor: true, icone: true } },
  contaOrigem: { select: { id: true, nome: true, cor: true, icone: true } },
  contaDestino: { select: { id: true, nome: true, cor: true, icone: true } },
  cartao: { select: { id: true, nome: true } },
  responsavel: {
    select: {
      id: true,
      nome: true,
      fotoPerfil: true,
      usuario: { select: { id: true, nome: true, fotoPerfil: true } },
    },
  },
  tags: { select: { tag: { select: { id: true, nome: true, cor: true } } } },
};

const lancamentoIncludeDetalhado = {
  ...lancamentoIncludeListagem,
  subcategoria: { select: { id: true, nome: true } },
  centroCusto: { select: { id: true, nome: true, cor: true, icone: true } },
  cartao: { select: { id: true, nome: true, tipo: true, bandeira: true } },
  criadoPor: {
    select: { id: true, nome: true, usuario: { select: { id: true, nome: true } } },
  },
  anexos: {
    select: { id: true, url: true, nomeArquivo: true, mimeType: true, tamanho: true, criadoEm: true },
  },
  historicos: { orderBy: { criadoEm: 'desc' as const }, take: 50 },
};

const COLUNAS_ORDENACAO = ['dataHora', 'valor'] as const;

function buildFiltrosWhere(familiaId: string, filtros: FiltrosLancamento): Record<string, unknown> {
  const where: Record<string, unknown> = { familiaId };

  if (filtros.inicio || filtros.fim) {
    where.dataHora = {
      ...(filtros.inicio ? { gte: new Date(filtros.inicio) } : {}),
      ...(filtros.fim ? { lte: new Date(filtros.fim) } : {}),
    };
  }
  if (filtros.tipo?.length) where.tipo = { in: filtros.tipo };
  if (filtros.status?.length) where.status = { in: filtros.status };
  if (filtros.categoriaId?.length) where.categoriaId = { in: filtros.categoriaId };
  if (filtros.subcategoriaId?.length) where.subcategoriaId = { in: filtros.subcategoriaId };
  if (filtros.centroCustoId?.length) where.centroCustoId = { in: filtros.centroCustoId };
  if (filtros.cartaoId?.length) where.cartaoId = { in: filtros.cartaoId };
  if (filtros.responsavelId?.length) where.responsavelId = { in: filtros.responsavelId };
  if (filtros.origem?.length) where.origem = { in: filtros.origem };
  if (filtros.formaPagamento?.length) where.formaPagamento = { in: filtros.formaPagamento };
  if (filtros.contaId?.length) {
    where.OR = [
      { contaOrigemId: { in: filtros.contaId } },
      { contaDestinoId: { in: filtros.contaId } },
    ];
  }

  const faixaValor: Record<string, number> = {};
  if (filtros.valorMinimo !== undefined) faixaValor.gte = filtros.valorMinimo;
  if (filtros.valorMaximo !== undefined) faixaValor.lte = filtros.valorMaximo;
  if (Object.keys(faixaValor).length > 0) where.valor = faixaValor;

  if (filtros.busca) {
    where.OR = [
      { titulo: { contains: filtros.busca, mode: 'insensitive' } },
      { descricao: { contains: filtros.busca, mode: 'insensitive' } },
    ];
  }

  if (filtros.tagsIds?.length) {
    where.tags = { some: { tagId: { in: filtros.tagsIds } } };
  }

  return where;
}

function buildOrdenacao(ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
  if (ordenacao && ordenacao.length > 0) {
    const validas = ordenacao
      .filter((o) => (COLUNAS_ORDENACAO as readonly string[]).includes(o.coluna))
      .map((o) => ({ [o.coluna]: o.direcao }));
    if (validas.length > 0) return validas;
  }
  return [{ dataHora: 'desc' }] as { dataHora: 'desc' }[];
}

export const lancamentoRepository = {
  createIn(
    tx: TxClient,
    familiaId: string,
    criadoPorId: string,
    dados: Omit<CriarLancamentoDTO, 'dataHora' | 'tagsIds'> & {
      dataHora: Date;
      status: StatusLancamento;
      origem: OrigemLancamento;
      tagsIds?: string[];
      recorrenciaId?: string | null;
      orcamentoId?: string | null;
    },
  ) {
    return tx.lancamento.create({
      data: {
        familiaId,
        criadoPorId,
        responsavelId: dados.responsavelId,
        tipo: dados.tipo,
        titulo: dados.titulo,
        descricao: dados.descricao ?? null,
        valor: dados.valor,
        moeda: dados.moeda ?? 'BRL',
        categoriaId: dados.categoriaId ?? null,
        subcategoriaId: dados.subcategoriaId ?? null,
        centroCustoId: dados.centroCustoId ?? null,
        contaOrigemId: dados.contaOrigemId,
        contaDestinoId: dados.contaDestinoId ?? null,
        cartaoId: dados.cartaoId ?? null,
        formaPagamento: dados.formaPagamento ?? null,
        dataHora: dados.dataHora,
        observacoes: dados.observacoes ?? null,
        status: dados.status,
        origem: dados.origem,
        recorrenciaId: dados.recorrenciaId ?? null,
        orcamentoId: dados.orcamentoId ?? null,
        localizacao: dados.localizacao ?? null,
        tags: dados.tagsIds?.length ? { create: dados.tagsIds.map((tagId) => ({ tagId })) } : undefined,
      },
    });
  },

  findById(id: string) {
    return prisma.lancamento.findUnique({ where: { id } });
  },

  findDetailed(id: string) {
    return prisma.lancamento.findUnique({
      where: { id },
      include: lancamentoIncludeDetalhado,
    });
  },

  async findByFamiliaComFiltros(
    familiaId: string,
    filtros: FiltrosLancamento,
    options: ListagemOptions,
  ) {
    const where = buildFiltrosWhere(familiaId, filtros);
    const orderBy = buildOrdenacao(options.ordenacao);
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.lancamento.findMany({ where, orderBy, skip, take: options.porPagina, include: lancamentoIncludeListagem }),
      prisma.lancamento.count({ where }),
    ]);

    return { data, total };
  },

  updateIn(tx: TxClient, id: string, data: Prisma.LancamentoUncheckedUpdateInput) {
    return tx.lancamento.update({ where: { id }, data });
  },

  deleteIn(tx: TxClient, id: string) {
    return tx.lancamento.delete({ where: { id } });
  },

  substituirTagsIn(tx: TxClient, lancamentoId: string, tagsIds: string[]) {
    return Promise.all([
      tx.lancamentoTag.deleteMany({ where: { lancamentoId } }),
      tagsIds.length ? tx.lancamentoTag.createMany({ data: tagsIds.map((tagId) => ({ lancamentoId, tagId })) }) : Promise.resolve(),
    ]);
  },

  createHistoricosIn(tx: TxClient, registros: RegistroHistorico[]) {
    if (!registros.length) return Promise.resolve();
    return tx.historicoLancamento.createMany({ data: registros });
  },

  async aplicarImpactoSaldoIn(tx: TxClient, deltas: DeltaSaldo[]) {
    const arredondar = (n: number) => Math.round(n * 100) / 100;
    const agrupado = new Map<string, { saldoAtual: number; saldoPrevisto: number }>();

    for (const d of deltas) {
      const atual = agrupado.get(d.contaId) ?? { saldoAtual: 0, saldoPrevisto: 0 };
      atual[d.campo] = arredondar(atual[d.campo] + d.delta);
      agrupado.set(d.contaId, atual);
    }

    for (const [contaId, mudancas] of agrupado) {
      await tx.conta.update({
        where: { id: contaId },
        data: {
          saldoAtual: mudancas.saldoAtual !== 0 ? { increment: mudancas.saldoAtual } : undefined,
          saldoPrevisto: mudancas.saldoPrevisto !== 0 ? { increment: mudancas.saldoPrevisto } : undefined,
        },
      });
    }
  },

  resumoPorTipoStatus(familiaId: string, inicio: Date, fim: Date) {
    return prisma.lancamento.groupBy({
      by: ['tipo', 'status'],
      where: {
        familiaId,
        dataHora: { gte: inicio, lte: fim },
        status: { in: [StatusLancamento.PAGO, StatusLancamento.PENDENTE] },
      },
      _sum: { valor: true },
      _count: { _all: true },
    });
  },

  agruparPorCategoria(familiaId: string, inicio: Date, fim: Date) {
    return prisma.lancamento.groupBy({
      by: ['categoriaId', 'tipo'],
      where: {
        familiaId,
        dataHora: { gte: inicio, lte: fim },
        status: { in: [StatusLancamento.PAGO, StatusLancamento.PENDENTE] },
        tipo: { in: [TipoLancamento.RECEITA, TipoLancamento.DESPESA] },
      },
      _sum: { valor: true },
      _count: { _all: true },
    });
  },

  agruparPorFormaPagamento(familiaId: string, inicio: Date, fim: Date) {
    return prisma.lancamento.groupBy({
      by: ['formaPagamento'],
      where: {
        familiaId,
        dataHora: { gte: inicio, lte: fim },
        status: { in: [StatusLancamento.PAGO, StatusLancamento.PENDENTE] },
        formaPagamento: { not: null },
      },
      _sum: { valor: true },
      _count: { _all: true },
    });
  },

  movimentosPorConta(familiaId: string, inicio: Date, fim: Date) {
    return prisma.$queryRaw<
      { conta_id: string; entradas: Prisma.Decimal; saidas: Prisma.Decimal; quantidade: bigint }[]
    >`
      WITH movimentos AS (
        SELECT "contaOrigemId" AS conta_id,
               CASE "tipo"
                 WHEN 'RECEITA' THEN "valor"
                 WHEN 'AJUSTE' THEN "valor"
                 WHEN 'DESPESA' THEN -"valor"
                 WHEN 'TRANSFERENCIA' THEN -"valor"
               END AS valor_assinado
        FROM "lancamentos"
        WHERE "familiaId" = ${familiaId}
          AND "status" IN ('PAGO', 'PENDENTE')
          AND "dataHora" >= ${inicio} AND "dataHora" <= ${fim}
        UNION ALL
        SELECT "contaDestinoId", "valor"
        FROM "lancamentos"
        WHERE "familiaId" = ${familiaId}
          AND "status" IN ('PAGO', 'PENDENTE')
          AND "tipo" = 'TRANSFERENCIA'
          AND "dataHora" >= ${inicio} AND "dataHora" <= ${fim}
      )
      SELECT conta_id,
             COALESCE(SUM(CASE WHEN valor_assinado >= 0 THEN valor_assinado ELSE 0 END), 0) AS entradas,
             COALESCE(SUM(CASE WHEN valor_assinado < 0 THEN -valor_assinado ELSE 0 END), 0) AS saidas,
             COUNT(*) AS quantidade
      FROM movimentos
      GROUP BY conta_id
      ORDER BY saidas DESC
    `;
  },

  agruparPorPeriodo(familiaId: string, inicio: Date, fim: Date, granularidade: GranularidadePeriodo) {
    const unidades = { DIA: 'day', SEMANA: 'week', MES: 'month' } as const;
    const unidade = unidades[granularidade];
    return prisma.$queryRaw<{ periodo: Date; receitas: Prisma.Decimal; despesas: Prisma.Decimal; quantidade: bigint }[]>`
      SELECT date_trunc(${unidade}, "dataHora") AS periodo,
             SUM(CASE WHEN "tipo" = 'RECEITA' THEN "valor" ELSE 0 END) AS receitas,
             SUM(CASE WHEN "tipo" = 'DESPESA' THEN "valor" ELSE 0 END) AS despesas,
             COUNT(*) AS quantidade
      FROM "lancamentos"
      WHERE "familiaId" = ${familiaId}
        AND "status" IN ('PAGO', 'PENDENTE')
        AND "dataHora" >= ${inicio} AND "dataHora" <= ${fim}
      GROUP BY 1
      ORDER BY 1
    `;
  },
};
