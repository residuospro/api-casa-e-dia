import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import { orcamentoRepository } from '../../repositories/financeiro/orcamento.repository';
import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { categoriaFinanceiraRepository } from '../../repositories/financeiro/categoria-financeira.repository';
import { lancamentoRepository, DeltaSaldo } from '../../repositories/financeiro/lancamento.repository';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse, ListagemParams } from '../../helpers/listagem.helper';
import {
  AtualizarOrcamentoDTO,
  CriarOrcamentoDTO,
  FiltrosOrcamento,
} from '../../models/financeiro/orcamento.model';
import { IndicadorOrcamento, StatusLancamento, TipoLancamento, TipoCategoriaFinanceira, FormaPagamento } from '../../models/enums';
import {
  arredondar2,
  calcularDeltasImpacto,
  contaParaConsumo,
  obterMesAno,
  usaCartaoCredito,
} from './lancamento.regras';

function toNumero(valor: Prisma.Decimal | number | null | undefined): number {
  return Number(valor ?? 0);
}

function calcularIndicador(valorAtual: number, valorLimite: number) {
  const consumo = arredondar2(valorAtual);
  const limite = arredondar2(valorLimite);
  const percentualUtilizado = limite > 0 ? arredondar2((consumo / limite) * 100) : 0;
  const indicador: IndicadorOrcamento =
    percentualUtilizado >= 100
      ? IndicadorOrcamento.ULTRAPASSADO
      : percentualUtilizado >= 80
        ? IndicadorOrcamento.PROXIMO
        : IndicadorOrcamento.NORMAL;
  return {
    valorRestante: arredondar2(limite - consumo),
    percentualUtilizado,
    indicador,
  };
}

function comIndicador<T extends {
  valorAtual: Prisma.Decimal | number;
  valorLimite: Prisma.Decimal | number;
}>(orcamento: T) {
  return {
    ...orcamento,
    valorAtual: toNumero(orcamento.valorAtual),
    valorLimite: toNumero(orcamento.valorLimite),
    ...calcularIndicador(toNumero(orcamento.valorAtual), toNumero(orcamento.valorLimite)),
  };
}

const COLUNAS_ORDENACAO_IN_MEMORIA = ['ano', 'mes', 'valorLimite', 'valorAtual', 'percentualUtilizado', 'criadoEm'];

function ordenarItens<T>(itens: T[], ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]): T[] {
  const comps =
    ordenacao && ordenacao.length > 0
      ? ordenacao
          .filter((o) => COLUNAS_ORDENACAO_IN_MEMORIA.includes(o.coluna))
          .map((o) => ({ coluna: o.coluna, mult: o.direcao === 'asc' ? 1 : -1 }))
      : [
          { coluna: 'ano', mult: -1 },
          { coluna: 'mes', mult: -1 },
        ];

  if (comps.length === 0) {
    return itens;
  }

  return [...itens].sort((a, b) => {
    for (const cmp of comps) {
      const av = (a as Record<string, unknown>)[cmp.coluna];
      const bv = (b as Record<string, unknown>)[cmp.coluna];
      if (av === undefined || bv === undefined) continue;
      const an = Number(av);
      const bn = Number(bv);
      if (Number.isNaN(an) || Number.isNaN(bn)) continue;
      if (an < bn) return -1 * cmp.mult;
      if (an > bn) return 1 * cmp.mult;
    }
    return 0;
  });
}

export class OrcamentoService {
  // ==================== CRUD ====================

  async criar(familiaId: string, dto: CriarOrcamentoDTO) {
    const categoria = await categoriaFinanceiraRepository.findById(dto.categoriaId);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Categoria nao encontrada nesta familia', 404);
    }
    if (categoria.tipo !== TipoCategoriaFinanceira.DESPESA && categoria.tipo !== TipoCategoriaFinanceira.AMBOS) {
      throw new AppError('Orcamento deve ser criado para uma categoria de despesa', 400);
    }

    const conta = await contaRepository.findById(dto.contaId);
    if (!conta || conta.familiaId !== familiaId || conta.ativo !== true) {
      throw new AppError('Conta nao encontrada nesta familia', 404);
    }

    const existente = await orcamentoRepository.findUniqueKey(familiaId, dto.categoriaId, dto.mes, dto.ano);
    if (existente) {
      throw new AppError('Ja existe um orcamento para esta categoria neste mes', 409);
    }

    const valorLimite = arredondar2(dto.valorLimite);
    const inicio = new Date(dto.ano, dto.mes - 1, 1);
    const fim = new Date(dto.ano, dto.mes, 1);

    const resultado = await prisma.$transaction(async (tx) => {
      const criado = await orcamentoRepository.createIn(tx, familiaId, { ...dto, valorLimite });

      // R2: adota retroativamente as despesas da categoria/mes ja existentes:
      // reverte o impacto delas no saldo (passam a ser cobertas pela reserva)
      // e usa a soma delas como valorAtual inicial.
      const consumo = (await tx.lancamento.findMany({
        where: {
          familiaId,
          categoriaId: dto.categoriaId,
          tipo: TipoLancamento.DESPESA,
          status: { in: [StatusLancamento.PAGO, StatusLancamento.PENDENTE] },
          dataHora: { gte: inicio, lt: fim },
        },
        select: { id: true, valor: true, status: true, contaOrigemId: true, cartaoId: true, formaPagamento: true },
      })).filter((l) => contaParaConsumo(l.status as StatusLancamento));

      const reversao = consumo
        .flatMap((l) =>
          calcularDeltasImpacto({
            tipo: TipoLancamento.DESPESA,
            valor: Number(l.valor),
            status: l.status as StatusLancamento,
            contaOrigemId: l.contaOrigemId,
            afetaConta: !usaCartaoCredito({
              tipo: TipoLancamento.DESPESA,
              cartaoId: l.cartaoId,
              formaPagamento: l.formaPagamento as FormaPagamento | null,
            }),
          }).map((d) => ({ ...d, delta: arredondar2(-d.delta) })),
        )
        .filter((d) => d.delta !== 0);

      const seed = arredondar2(consumo.reduce((acc, l) => acc + Number(l.valor), 0));

      if (reversao.length) {
        await lancamentoRepository.aplicarImpactoSaldoIn(tx, reversao);
      }
      await orcamentoRepository.vincularLancamentosIn(tx, criado.id, consumo.map((l) => l.id));
      await orcamentoRepository.updateValorAtualIn(tx, criado.id, seed);

      // R1: reserva o valor limite no saldo atual da conta.
      await lancamentoRepository.aplicarImpactoSaldoIn(tx, [
        { contaId: dto.contaId, campo: 'saldoAtual', delta: -valorLimite },
      ]);

      return { ...criado, valorAtual: seed };
    });

    return comIndicador(resultado);
  }

  async listar(
    familiaId: string,
    filtros: FiltrosOrcamento,
    options: ListagemOptions,
    params: ListagemParams,
    filtro?: Record<string, string | string[]>,
    ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
  ) {
    if (filtros.status?.length) {
      const todos = await orcamentoRepository.findAllByFamilia(familiaId, filtros);
      const itens = ordenarItens(
        todos
          .map(comIndicador)
          .filter((o) => filtros.status!.includes(o.indicador)),
        options.ordenacao,
      );
      const total = itens.length;
      const inicio = (options.pagina - 1) * options.porPagina;
      return paginatedResponse(
        itens.slice(inicio, inicio + options.porPagina),
        total,
        options,
        params,
        filtro,
        ordenacao,
      );
    }

    const { data, total } = await orcamentoRepository.findByFamiliaWithFilters(familiaId, filtros, options);
    return paginatedResponse(data.map(comIndicador), total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const orcamento = await this.obterOrcamentoValido(familiaId, id);
    return comIndicador(orcamento);
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarOrcamentoDTO) {
    const existente = await this.obterOrcamentoValido(familiaId, id);

    if (dto.valorLimite === undefined && dto.contaId === undefined) {
      return comIndicador(existente);
    }

    const valorAntigo = toNumero(existente.valorLimite);
    const valorNovo = dto.valorLimite !== undefined ? arredondar2(dto.valorLimite) : valorAntigo;

    if (dto.contaId !== undefined && dto.contaId !== existente.contaId) {
      const conta = await contaRepository.findById(dto.contaId);
      if (!conta || conta.familiaId !== familiaId || conta.ativo !== true) {
        throw new AppError('Conta nao encontrada nesta familia', 404);
      }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const deltas: DeltaSaldo[] = [];

      if (dto.contaId !== undefined && dto.contaId !== existente.contaId) {
        // Move a reserva para a nova conta (devolve na antiga e deduz na nova).
        deltas.push({ contaId: existente.contaId, campo: 'saldoAtual', delta: valorNovo });
        deltas.push({ contaId: dto.contaId as string, campo: 'saldoAtual', delta: arredondar2(-valorNovo) });
      } else if (dto.valorLimite !== undefined) {
        const delta = arredondar2(valorNovo - valorAntigo);
        if (delta !== 0) {
          deltas.push({ contaId: existente.contaId, campo: 'saldoAtual', delta });
        }
      }

      if (deltas.length) {
        await lancamentoRepository.aplicarImpactoSaldoIn(tx, deltas);
      }

      return orcamentoRepository.updateIn(tx, id, dto);
    });

    return comIndicador(resultado);
  }

  async remover(familiaId: string, id: string) {
    const existente = await this.obterOrcamentoValido(familiaId, id);
    const valorLimite = toNumero(existente.valorLimite);

    await prisma.$transaction(async (tx) => {
      // R3: devolve a reserva nao gasta (valor limite menos o que ja foi pago).
      const somaPago = await orcamentoRepository.sumPagoByOrcamentoIn(tx, id);
      const devolucao = arredondar2(valorLimite - toNumero(somaPago._sum.valor));
      if (devolucao !== 0) {
        await lancamentoRepository.aplicarImpactoSaldoIn(tx, [
          { contaId: existente.contaId, campo: 'saldoAtual', delta: devolucao },
        ]);
      }

      // As despesas PENDENTE cobertas voltam ao comportamento normal (saldoPrevisto).
      const consumo = await orcamentoRepository.listConsumoByOrcamentoIn(tx, id);
      const deltasPendentes = consumo
        .filter(
          (l) =>
            l.status === StatusLancamento.PENDENTE &&
            !usaCartaoCredito({
              tipo: TipoLancamento.DESPESA,
              cartaoId: l.cartaoId,
              formaPagamento: l.formaPagamento as FormaPagamento | null,
            }),
        )
        .map((l) => ({
          contaId: l.contaOrigemId,
          campo: 'saldoPrevisto' as const,
          delta: arredondar2(-Number(l.valor)),
        }));

      if (deltasPendentes.length) {
        await lancamentoRepository.aplicarImpactoSaldoIn(tx, deltasPendentes);
      }

      await orcamentoRepository.desvincularLancamentosIn(tx, id);
      await orcamentoRepository.deleteIn(tx, id);
    });
  }

  // ==================== RESUMO ====================

  async resumo(familiaId: string, mes: number, ano: number) {
    const lista = await orcamentoRepository.findByFamiliaMesAno(familiaId, mes, ano);
    const itens = lista.map(comIndicador);

    let totalOrcado = 0;
    let totalConsumido = 0;
    let totalRestante = 0;
    const porIndicador: Record<IndicadorOrcamento, number> = {
      [IndicadorOrcamento.NORMAL]: 0,
      [IndicadorOrcamento.PROXIMO]: 0,
      [IndicadorOrcamento.ULTRAPASSADO]: 0,
    };

    for (const item of itens) {
      totalOrcado += item.valorLimite;
      totalConsumido += item.valorAtual;
      totalRestante += item.valorRestante;
      porIndicador[item.indicador] += 1;
    }

    return {
      mes,
      ano,
      quantidadeOrcamentos: itens.length,
      totalOrcado: arredondar2(totalOrcado),
      totalConsumido: arredondar2(totalConsumido),
      totalRestante: arredondar2(totalRestante),
      percentualGlobal: totalOrcado > 0 ? arredondar2((totalConsumido / totalOrcado) * 100) : 0,
      porIndicador,
      orcamentos: itens,
    };
  }

  // ==================== INTEGRACAO COM LANCAMENTOS ====================

  /**
   * Retorna o id do orcamento que cobre um lancamento (despesa com categoria no
   * mes/ano da data informada) ou null quando nao coberto por nenhum.
   */
  async coberturaParaIn(
    tx: Prisma.TransactionClient,
    familiaId: string,
    dados: { tipo: TipoLancamento; categoriaId: string | null; dataHora: Date },
  ): Promise<string | null> {
    if (dados.tipo !== TipoLancamento.DESPESA || !dados.categoriaId) {
      return null;
    }
    const { mes, ano } = obterMesAno(dados.dataHora);
    const orcamento = await orcamentoRepository.findUniqueKeyIn(tx, familiaId, dados.categoriaId, mes, ano);
    return orcamento ? orcamento.id : null;
  }

  /**
   * Recalcula o valorAtual de um orcamento a partir dos lancamentos vinculados.
   * Deve ser chamado dentro da transacao, depois de vincular/desvincular lancamentos.
   */
  async recalcularConsumoIn(tx: Prisma.TransactionClient, orcamentoId: string) {
    if (!orcamentoId) return;
    const soma = await orcamentoRepository.sumConsumoIn(tx, orcamentoId);
    await orcamentoRepository.updateValorAtualIn(tx, orcamentoId, arredondar2(toNumero(soma._sum.valor)));
  }

  // ==================== PRIVADOS ====================

  private async obterOrcamentoValido(familiaId: string, id: string) {
    const orcamento = await orcamentoRepository.findById(id);
    if (!orcamento || orcamento.familiaId !== familiaId) {
      throw new AppError('Orcamento nao encontrado', 404);
    }
    return orcamento;
  }
}

export const orcamentoService = new OrcamentoService();