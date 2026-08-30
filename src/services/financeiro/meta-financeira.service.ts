import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import { metaFinanceiraRepository } from '../../repositories/financeiro/meta-financeira.repository';
import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { lancamentoRepository } from '../../repositories/financeiro/lancamento.repository';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';
import {
  AtualizarMetaFinanceiraDTO,
  CriarMetaFinanceiraDTO,
  FiltrosMetaFinanceira,
  MovimentacaoMetaFinanceiraDTO,
} from '../../models/financeiro/meta-financeira.model';
import { StatusMetaFinanceira, TipoMovimentacaoMeta } from '../../models/enums';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNumero(valor: Prisma.Decimal | number | null | undefined): number {
  return Number(valor ?? 0);
}

/**
 * Campos calculados do progresso da meta (nao persistidos).
 * O percentual e limitado a 100% e o valor restante nunca fica negativo.
 */
function calcularProgresso(valorAtual: number, valorObjetivo: number) {
  const atual = arredondar2(valorAtual);
  const objetivo = arredondar2(valorObjetivo);
  const percentual = objetivo > 0 ? arredondar2((atual / objetivo) * 100) : 0;
  return {
    percentualConcluido: Math.min(100, Math.max(0, percentual)),
    valorRestante: arredondar2(Math.max(0, objetivo - atual)),
  };
}

function comProgresso<T extends {
  valorAtual: Prisma.Decimal | number;
  valorObjetivo: Prisma.Decimal | number;
}>(meta: T) {
  return { ...meta, ...calcularProgresso(toNumero(meta.valorAtual), toNumero(meta.valorObjetivo)) };
}

export class MetaFinanceiraService {
  // ==================== CRUD ====================

  async criar(familiaId: string, dto: CriarMetaFinanceiraDTO) {
    await this.validarContaDestino(familiaId, dto.contaDestinoId);
    const meta = await metaFinanceiraRepository.create(familiaId, dto);
    return comProgresso(meta);
  }

  async listar(
    familiaId: string,
    filtros: FiltrosMetaFinanceira,
    options: ListagemOptions,
    params: { pagina: number; por_pagina: number },
    filtro?: Record<string, string | string[]>,
    ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
  ) {
    const { data, total } = await metaFinanceiraRepository.findByFamiliaWithFilters(
      familiaId,
      filtros,
      options,
    );
    return paginatedResponse(data.map(comProgresso), total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const meta = await this.obterMetaValida(familiaId, id);
    return comProgresso(meta);
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarMetaFinanceiraDTO) {
    const existente = await this.obterMetaValida(familiaId, id);
    await this.validarContaDestino(familiaId, dto.contaDestinoId);

    const valorAtual = toNumero(existente.valorAtual);
    const valorObjetivo =
      dto.valorObjetivo !== undefined ? dto.valorObjetivo : toNumero(existente.valorObjetivo);

    let meta = await metaFinanceiraRepository.update(id, dto);
    if (existente.status === StatusMetaFinanceira.EM_ANDAMENTO && valorAtual >= valorObjetivo) {
      meta = await metaFinanceiraRepository.updateStatus(id, StatusMetaFinanceira.CONCLUIDA);
    }
    return comProgresso(meta);
  }

  // ==================== STATUS ====================

  async cancelar(familiaId: string, id: string) {
    const existente = await this.obterMetaValida(familiaId, id);
    if (existente.status !== StatusMetaFinanceira.EM_ANDAMENTO) {
      throw new AppError('Somente metas em andamento podem ser canceladas', 400);
    }
    return comProgresso(
      await metaFinanceiraRepository.updateStatus(id, StatusMetaFinanceira.CANCELADA),
    );
  }

  async remover(familiaId: string, id: string) {
    await this.obterMetaValida(familiaId, id);
    await metaFinanceiraRepository.delete(id);
  }

  async concluir(familiaId: string, id: string) {
    const existente = await this.obterMetaValida(familiaId, id);
    if (existente.status !== StatusMetaFinanceira.EM_ANDAMENTO) {
      throw new AppError('Somente metas em andamento podem ser concluidas', 400);
    }
    if (toNumero(existente.valorAtual) < toNumero(existente.valorObjetivo)) {
      throw new AppError('A meta so pode ser concluida quando o objetivo for atingido', 400);
    }
    return comProgresso(
      await metaFinanceiraRepository.updateStatus(id, StatusMetaFinanceira.CONCLUIDA),
    );
  }

  // ==================== MOVIMENTACOES ====================

  /**
   * Adiciona ou retira valor do acumulado da meta dentro de uma transacao:
   * - impede valor negativo no acumulado;
   * - conclui automaticamente quando valorAtual >= valorObjetivo;
   * - uma SAIDA que derrubar o acumulado abaixo do objetivo reabre a meta;
   * - quando ha conta vinculada, ajusta o saldoAtual da conta (sem criar lancamento);
   * - grava o historico com data, valor, tipo e quem realizou.
   */
  async registrarMovimentacao(
    familiaId: string,
    metaId: string,
    usuarioId: string,
    dto: MovimentacaoMetaFinanceiraDTO,
  ) {
    const meta = await this.obterMetaValida(familiaId, metaId);

    if (meta.status === StatusMetaFinanceira.CANCELADA) {
      throw new AppError('Nao e possivel movimentar uma meta cancelada', 400);
    }

    const valor = arredondar2(dto.valor);
    const valorAtual = toNumero(meta.valorAtual);
    const valorObjetivo = toNumero(meta.valorObjetivo);

    const novoValorAtual =
      dto.tipo === TipoMovimentacaoMeta.ENTRADA
        ? arredondar2(valorAtual + valor)
        : arredondar2(valorAtual - valor);

    if (dto.tipo === TipoMovimentacaoMeta.SAIDA && novoValorAtual < 0) {
      throw new AppError('Valor acumulado nao pode ficar negativo', 400);
    }

    const novoStatus: StatusMetaFinanceira =
      novoValorAtual >= valorObjetivo
        ? StatusMetaFinanceira.CONCLUIDA
        : StatusMetaFinanceira.EM_ANDAMENTO;

    const resultado = await prisma.$transaction(async (tx) => {
      await metaFinanceiraRepository.updateValorAndStatusIn(tx, metaId, novoValorAtual, novoStatus);

      if (meta.contaDestinoId) {
        const delta = dto.tipo === TipoMovimentacaoMeta.ENTRADA ? valor : -valor;
        await lancamentoRepository.aplicarImpactoSaldoIn(tx, [
          { contaId: meta.contaDestinoId, campo: 'saldoAtual', delta },
        ]);
      }

      return metaFinanceiraRepository.createMovimentacaoIn(tx, {
        metaFinanceiraId: metaId,
        usuarioId,
        tipo: dto.tipo,
        valor,
        saldoAnterior: valorAtual,
        saldoNovo: novoValorAtual,
        observacao: dto.observacao ?? null,
      });
    });

    const metaResposta = { ...meta, valorAtual: novoValorAtual, status: novoStatus };
    return { ...comProgresso(metaResposta), movimentacao: resultado };
  }

  async listarMovimentacoes(
    familiaId: string,
    metaId: string,
    options: ListagemOptions,
    params: { pagina: number; por_pagina: number },
    filtro?: Record<string, string | string[]>,
    ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
  ) {
    await this.obterMetaValida(familiaId, metaId);
    const { data, total } = await metaFinanceiraRepository.findMovimentacoes(metaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  // ==================== PRIVADOS ====================

  private async obterMetaValida(familiaId: string, id: string) {
    const meta = await metaFinanceiraRepository.findById(id);
    if (!meta || meta.familiaId !== familiaId) {
      throw new AppError('Meta financeira nao encontrada', 404);
    }
    return meta;
  }

  private async validarContaDestino(familiaId: string, contaDestinoId?: string | null) {
    if (!contaDestinoId) return;
    const conta = await contaRepository.findById(contaDestinoId);
    if (!conta || conta.familiaId !== familiaId) {
      throw new AppError('Conta de destino nao encontrada nesta familia', 404);
    }
  }
}

export const metaFinanceiraService = new MetaFinanceiraService();