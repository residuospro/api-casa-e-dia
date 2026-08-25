import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import {
  lancamentoRepository,
  DeltaSaldo,
  RegistroHistorico,
} from '../../repositories/financeiro/lancamento.repository';
import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { categoriaFinanceiraRepository } from '../../repositories/financeiro/categoria-financeira.repository';
import { subcategoriaRepository } from '../../repositories/financeiro/subcategoria.repository';
import { centroCustoRepository } from '../../repositories/financeiro/centro-custo.repository';
import { cartaoRepository } from '../../repositories/financeiro/cartao.repository';
import { tagRepository } from '../../repositories/financeiro/tag.repository';
import { familyRepository } from '../../repositories/family.repository';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';
import {
  AlterarStatusLancamentoDTO,
  AtualizarLancamentoDTO,
  CriarLancamentoDTO,
  FiltrosLancamento,
  GranularidadePeriodo,
} from '../../models/financeiro/lancamento.model';
import { StatusLancamento, TipoLancamento, FormaPagamento, OrigemLancamento, Moeda } from '../../models/enums';

// ============ Regras de impacto no saldo ============
//
// Como o saldo das contas e afetado por cada tipo de lancamento:
//
// - RECEITA:      +valor na contaOrigem (convencao: a conta que recebe o dinheiro
//                  fica em contaOrigemId; RECEITA nunca usa contaDestinoId)
// - DESPESA:      -valor na contaOrigem
// - TRANSFERENCIA: -valor na contaOrigem e +valor na contaDestino
// - AJUSTE:       correcao de saldo na contaOrigem. O valor e assinado:
//                  positivo soma ao saldo, negativo subtrai (unica excecao a regra
//                  de valor > 0). Serve para corrigir diferencas de saldo.
//
// O status define QUAL saldo e afetado:
// - PENDENTE:    afeta apenas saldoPrevisto
// - PAGO:        afeta apenas saldoAtual (deixa de compor o previsto)
// - CANCELADO:   nao afeta nenhum saldo (permanece para historico)
// - IGNORADO:    nao afeta nenhum saldo (permanece para historico)
//
// Excecao: DESPESA paga com cartao de credito (cartaoId + formaPagamento CREDITO)
// nao altera o saldo da conta vinculada. O impacto na fatura do cartao sera
// tratado em modulo futuro.

export interface EstadoFinanceiroLancamento {
  tipo: TipoLancamento;
  valor: number;
  status: StatusLancamento;
  contaOrigemId: string;
  contaDestinoId?: string | null;
  afetaConta: boolean;
}

export function usaCartaoCredito(l: { tipo: TipoLancamento; cartaoId?: string | null; formaPagamento?: FormaPagamento | null }): boolean {
  return l.tipo === TipoLancamento.DESPESA && !!l.cartaoId && l.formaPagamento === FormaPagamento.CREDITO;
}

export function calcularDeltasImpacto(estado: EstadoFinanceiroLancamento): DeltaSaldo[] {
  if (
    !estado.afetaConta ||
    estado.status === StatusLancamento.CANCELADO ||
    estado.status === StatusLancamento.IGNORADO
  ) {
    return [];
  }

  const campo: DeltaSaldo['campo'] =
    estado.status === StatusLancamento.PAGO ? 'saldoAtual' : 'saldoPrevisto';

  switch (estado.tipo) {
    case TipoLancamento.RECEITA:
      return [{ contaId: estado.contaOrigemId, campo, delta: arredondar2(estado.valor) }];
    case TipoLancamento.DESPESA:
      return [{ contaId: estado.contaOrigemId, campo, delta: arredondar2(-estado.valor) }];
    case TipoLancamento.AJUSTE:
      return [{ contaId: estado.contaOrigemId, campo, delta: arredondar2(estado.valor) }];
    case TipoLancamento.TRANSFERENCIA:
      return [
        { contaId: estado.contaOrigemId, campo, delta: arredondar2(-estado.valor) },
        { contaId: estado.contaDestinoId as string, campo, delta: arredondar2(estado.valor) },
      ];
    default:
      return [];
  }
}

interface LancamentoMesclado {
  tipo: TipoLancamento;
  titulo: string;
  descricao: string | null;
  valor: number;
  moeda: Moeda;
  categoriaId: string | null;
  subcategoriaId: string | null;
  centroCustoId: string | null;
  contaOrigemId: string;
  contaDestinoId: string | null;
  cartaoId: string | null;
  formaPagamento: FormaPagamento | null;
  observacoes: string | null;
  responsavelId: string;
  localizacao: string | null;
  status: StatusLancamento;
  dataHora: Date;
}

const TRANSICOES_PERMITIDAS: Record<StatusLancamento, StatusLancamento[]> = {
  [StatusLancamento.PENDENTE]: [StatusLancamento.PAGO, StatusLancamento.CANCELADO, StatusLancamento.IGNORADO],
  [StatusLancamento.PAGO]: [StatusLancamento.PENDENTE, StatusLancamento.CANCELADO, StatusLancamento.IGNORADO],
  [StatusLancamento.CANCELADO]: [StatusLancamento.PENDENTE],
  [StatusLancamento.IGNORADO]: [StatusLancamento.PENDENTE],
};

const CAMPOS_HISTORICO: string[] = [
  'titulo',
  'descricao',
  'valor',
  'moeda',
  'tipo',
  'categoriaId',
  'subcategoriaId',
  'centroCustoId',
  'contaOrigemId',
  'contaDestinoId',
  'cartaoId',
  'formaPagamento',
  'dataHora',
  'observacoes',
  'responsavelId',
  'localizacao',
];

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

function serializarValorHistorico(valor: unknown): string | null {
  if (valor === undefined) return null;
  if (valor === null) return null;
  if (valor instanceof Date) return valor.toISOString();
  return String(valor);
}

export class LancamentoService {
  // ==================== CRIACAO ====================

  async criar(familiaId: string, criadoPorMembroId: string, usuarioId: string, dto: CriarLancamentoDTO) {
    this.validarRegrasTipo(dto);

    await this.validarReferencias(familiaId, dto);

    const dataHora = new Date(dto.dataHora);
    const afetaConta = !usaCartaoCredito(dto);

    return prisma.$transaction(async (tx) => {
      const lancamento = await lancamentoRepository.createIn(tx, familiaId, criadoPorMembroId, {
        ...dto,
        tagsIds: dto.tagsIds ? [...new Set(dto.tagsIds)] : undefined,
        dataHora,
        status: StatusLancamento.PENDENTE,
        origem: OrigemLancamento.MANUAL,
      });

      const deltas = calcularDeltasImpacto({
        tipo: dto.tipo,
        valor: dto.valor,
        status: StatusLancamento.PENDENTE,
        contaOrigemId: dto.contaOrigemId,
        contaDestinoId: dto.contaDestinoId ?? null,
        afetaConta,
      });
      await lancamentoRepository.aplicarImpactoSaldoIn(tx, deltas);

      await lancamentoRepository.createHistoricosIn(tx, [
        { lancamentoId: lancamento.id, usuarioId, campo: 'CRIACAO', novoValor: dto.titulo },
      ]);

      return lancamento;
    });
  }

  // ==================== CONSULTAS ====================

  async listar(familiaId: string, filtros: FiltrosLancamento, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const { data, total } = await lancamentoRepository.findByFamiliaComFiltros(familiaId, filtros, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const lancamento = await lancamentoRepository.findDetailed(id);
    if (!lancamento || lancamento.familiaId !== familiaId) {
      throw new AppError('Lancamento nao encontrado', 404);
    }
    return lancamento;
  }

  // ==================== ATUALIZACAO ====================

  async atualizar(familiaId: string, usuarioId: string, id: string, dto: AtualizarLancamentoDTO) {
    const existente = await lancamentoRepository.findById(id);
    if (!existente || existente.familiaId !== familiaId) {
      throw new AppError('Lancamento nao encontrado', 404);
    }

    const merged = this.mesclar(existente, dto);
    this.validarRegrasTipo(merged);

    await this.validarReferencias(familiaId, {
      tipo: merged.tipo,
      contaOrigemId: dto.contaOrigemId,
      contaDestinoId: dto.contaDestinoId !== undefined ? dto.contaDestinoId : undefined,
      cartaoId: dto.cartaoId,
      centroCustoId: dto.centroCustoId,
      responsavelId: dto.responsavelId,
      tagsIds: dto.tagsIds?.length ? [...new Set(dto.tagsIds)] : undefined,
      categoriaId: merged.categoriaId ?? undefined,
      subcategoriaId: merged.subcategoriaId ?? undefined,
    });

    const dataHoraNovo = dto.dataHora !== undefined ? new Date(dto.dataHora) : existente.dataHora;

    const estadoAnterior: EstadoFinanceiroLancamento = {
      tipo: existente.tipo as TipoLancamento,
      valor: Number(existente.valor),
      status: existente.status as StatusLancamento,
      contaOrigemId: existente.contaOrigemId,
      contaDestinoId: existente.contaDestinoId,
      afetaConta: !usaCartaoCredito({
        tipo: existente.tipo as TipoLancamento,
        cartaoId: existente.cartaoId,
        formaPagamento: existente.formaPagamento as FormaPagamento | null,
      }),
    };

    const estadoNovo: EstadoFinanceiroLancamento = {
      tipo: merged.tipo,
      valor: merged.valor,
      status: merged.status,
      contaOrigemId: merged.contaOrigemId,
      contaDestinoId: merged.contaDestinoId,
      afetaConta: !usaCartaoCredito(merged),
    };

    const historicos = this.montarHistoricosDiff(id, usuarioId, existente, dto, dataHoraNovo);

    await prisma.$transaction(async (tx) => {
      const reversao = calcularDeltasImpacto(estadoAnterior).map((d) => ({ ...d, delta: arredondar2(-d.delta) }));
      const aplicacao = calcularDeltasImpacto(estadoNovo);
      await lancamentoRepository.aplicarImpactoSaldoIn(tx, [...reversao, ...aplicacao]);

      await lancamentoRepository.updateIn(tx, id, this.montarDataUpdate(dto, dataHoraNovo));

      if (dto.tagsIds !== undefined) {
        await lancamentoRepository.substituirTagsIn(tx, id, [...new Set(dto.tagsIds)]);
      }

      await lancamentoRepository.createHistoricosIn(tx, historicos);
    });

    return lancamentoRepository.findDetailed(id);
  }

  // ==================== STATUS ====================

  async alterarStatus(familiaId: string, usuarioId: string, id: string, dto: AlterarStatusLancamentoDTO) {
    const existente = await lancamentoRepository.findById(id);
    if (!existente || existente.familiaId !== familiaId) {
      throw new AppError('Lancamento nao encontrado', 404);
    }

    const statusAtual = existente.status as StatusLancamento;

    if (statusAtual === dto.status) {
      return lancamentoRepository.findDetailed(id);
    }

    if (!TRANSICOES_PERMITIDAS[statusAtual].includes(dto.status)) {
      throw new AppError(`Transicao de status ${statusAtual} para ${dto.status} nao permitida`, 400);
    }

    const estadoComum: Omit<EstadoFinanceiroLancamento, 'status'> = {
      tipo: existente.tipo as TipoLancamento,
      valor: Number(existente.valor),
      contaOrigemId: existente.contaOrigemId,
      contaDestinoId: existente.contaDestinoId,
      afetaConta: !usaCartaoCredito({
        tipo: existente.tipo as TipoLancamento,
        cartaoId: existente.cartaoId,
        formaPagamento: existente.formaPagamento as FormaPagamento | null,
      }),
    };

    await prisma.$transaction(async (tx) => {
      const reversao = calcularDeltasImpacto({ ...estadoComum, status: statusAtual }).map((d) => ({
        ...d,
        delta: arredondar2(-d.delta),
      }));
      const aplicacao = calcularDeltasImpacto({ ...estadoComum, status: dto.status });
      await lancamentoRepository.aplicarImpactoSaldoIn(tx, [...reversao, ...aplicacao]);

      await lancamentoRepository.updateIn(tx, id, { status: dto.status });

      await lancamentoRepository.createHistoricosIn(tx, [
        {
          lancamentoId: id,
          usuarioId,
          campo: 'STATUS',
          valorAnterior: statusAtual,
          novoValor: dto.status,
        },
      ]);
    });

    return lancamentoRepository.findDetailed(id);
  }

  // ==================== EXCLUSAO ====================

  async remover(familiaId: string, usuarioId: string, id: string) {
    const existente = await lancamentoRepository.findById(id);
    if (!existente || existente.familiaId !== familiaId) {
      throw new AppError('Lancamento nao encontrado', 404);
    }

    await prisma.$transaction(async (tx) => {
      const deltasReverter = calcularDeltasImpacto({
        tipo: existente.tipo as TipoLancamento,
        valor: Number(existente.valor),
        status: existente.status as StatusLancamento,
        contaOrigemId: existente.contaOrigemId,
        contaDestinoId: existente.contaDestinoId,
        afetaConta: !usaCartaoCredito({
          tipo: existente.tipo as TipoLancamento,
          cartaoId: existente.cartaoId,
          formaPagamento: existente.formaPagamento as FormaPagamento | null,
        }),
      }).map((d) => ({ ...d, delta: arredondar2(-d.delta) }));

      await lancamentoRepository.createHistoricosIn(tx, [
        { lancamentoId: id, usuarioId, campo: 'EXCLUSAO', valorAnterior: existente.titulo },
      ]);
      await lancamentoRepository.aplicarImpactoSaldoIn(tx, deltasReverter);
      await lancamentoRepository.deleteIn(tx, id);
    });
  }

  // ==================== RESUMO E AGRUPAMENTOS ====================

  async resumo(familiaId: string, inicio: Date, fim: Date) {
    const linhas = await lancamentoRepository.resumoPorTipoStatus(familiaId, inicio, fim);

    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalTransferencias = 0;
    let totalAjustes = 0;
    let receitasRecebidas = 0;
    let receitasPendentes = 0;
    let despesasPagas = 0;
    let despesasPendentes = 0;
    let quantidadeLancamentos = 0;

    for (const linha of linhas) {
      const total = toNumero(linha._sum.valor);
      const quantidade = linha._count._all;
      quantidadeLancamentos += quantidade;

      switch (linha.tipo) {
        case TipoLancamento.RECEITA:
          totalReceitas += total;
          if (linha.status === StatusLancamento.PAGO) receitasRecebidas += total;
          else receitasPendentes += total;
          break;
        case TipoLancamento.DESPESA:
          totalDespesas += total;
          if (linha.status === StatusLancamento.PAGO) despesasPagas += total;
          else despesasPendentes += total;
          break;
        case TipoLancamento.TRANSFERENCIA:
          totalTransferencias += total;
          break;
        case TipoLancamento.AJUSTE:
          totalAjustes += total;
          break;
      }
    }

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      totalReceitas: arredondar2(totalReceitas),
      totalDespesas: arredondar2(totalDespesas),
      totalTransferencias: arredondar2(totalTransferencias),
      totalAjustes: arredondar2(totalAjustes),
      saldoPeriodo: arredondar2(totalReceitas - totalDespesas),
      quantidadeLancamentos,
      despesasPagas: arredondar2(despesasPagas),
      despesasPendentes: arredondar2(despesasPendentes),
      receitasRecebidas: arredondar2(receitasRecebidas),
      receitasPendentes: arredondar2(receitasPendentes),
    };
  }

  async agruparPorCategoria(familiaId: string, inicio: Date, fim: Date) {
    const linhas = await lancamentoRepository.agruparPorCategoria(familiaId, inicio, fim);

    const agrupado = new Map<string, { receitas: number; despesas: number; quantidade: number }>();
    for (const linha of linhas) {
      const chave = linha.categoriaId ?? '__sem_categoria__';
      const atual = agrupado.get(chave) ?? { receitas: 0, despesas: 0, quantidade: 0 };
      if (linha.tipo === TipoLancamento.RECEITA) atual.receitas += toNumero(linha._sum.valor);
      else atual.despesas += toNumero(linha._sum.valor);
      atual.quantidade += linha._count._all;
      agrupado.set(chave, atual);
    }

    const idsCategorias = [...agrupado.keys()].filter((k) => k !== '__sem_categoria__');
    const categorias = idsCategorias.length ? await categoriaFinanceiraRepository.findByIds(idsCategorias) : [];
    const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));

    const resultado = [...agrupado.entries()].map(([chave, v]) => {
      const semCategoria = chave === '__sem_categoria__';
      const categoria = semCategoria ? null : mapaCategorias.get(chave);
      return {
        categoriaId: semCategoria ? null : chave,
        categoria: categoria ? { id: categoria.id, nome: categoria.nome, cor: categoria.cor, icone: categoria.icone } : null,
        receitas: arredondar2(v.receitas),
        despesas: arredondar2(v.despesas),
        total: arredondar2(v.receitas + v.despesas),
        quantidade: v.quantidade,
      };
    });

    return resultado.sort((a, b) => b.total - a.total);
  }

  async agruparPorConta(familiaId: string, inicio: Date, fim: Date) {
    const [movimentos, contas] = await Promise.all([
      lancamentoRepository.movimentosPorConta(familiaId, inicio, fim),
      contaRepository.findByFamilia(familiaId),
    ]);

    const mapaContas = new Map(contas.map((c) => [c.id, c]));

    return movimentos.map((m) => {
      const conta = mapaContas.get(m.conta_id);
      const entradas = toNumero(m.entradas);
      const saidas = toNumero(m.saidas);
      return {
        contaId: m.conta_id,
        conta: conta ? { id: conta.id, nome: conta.nome, cor: conta.cor, icone: conta.icone } : null,
        entradas: arredondar2(entradas),
        saidas: arredondar2(saidas),
        saldoMovimentado: arredondar2(entradas - saidas),
        quantidade: Number(m.quantidade),
      };
    });
  }

  async agruparPorFormaPagamento(familiaId: string, inicio: Date, fim: Date) {
    const linhas = await lancamentoRepository.agruparPorFormaPagamento(familiaId, inicio, fim);

    return linhas
      .map((l) => ({
        formaPagamento: l.formaPagamento,
        total: arredondar2(toNumero(l._sum.valor)),
        quantidade: l._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async agruparPorPeriodo(familiaId: string, inicio: Date, fim: Date, granularidade: GranularidadePeriodo) {
    const linhas = await lancamentoRepository.agruparPorPeriodo(familiaId, inicio, fim, granularidade);

    return linhas.map((l) => {
      const receitas = toNumero(l.receitas);
      const despesas = toNumero(l.despesas);
      return {
        periodo: l.periodo.toISOString(),
        receitas: arredondar2(receitas),
        despesas: arredondar2(despesas),
        saldo: arredondar2(receitas - despesas),
        quantidade: Number(l.quantidade),
      };
    });
  }

  // ==================== REGRAS DE NEGOCIO (PRIVADAS) ====================

  /**
   * Regras estruturais por tipo de lancamento (sem acesso a banco):
   *
   * - TRANSFERENCIA: exige contaOrigemId e contaDestinoId diferentes;
   *   proibido categoria, subcategoria e cartao.
   * - AJUSTE: proibido categoria, subcategoria, cartao e contaDestino.
   *   Valor pode ser negativo (correcao para baixo).
   * - RECEITA/DESPESA: proibido contaDestino (RECEITA recebe na contaOrigem).
   */
  private validarRegrasTipo(dados: {
    tipo: TipoLancamento;
    valor: number;
    contaOrigemId: string;
    contaDestinoId?: string | null;
    categoriaId?: string | null;
    subcategoriaId?: string | null;
    cartaoId?: string | null;
  }) {
    const { tipo } = dados;

    if (tipo !== TipoLancamento.AJUSTE && dados.valor <= 0) {
      throw new AppError('Valor deve ser maior que zero', 400);
    }
    if (tipo === TipoLancamento.AJUSTE && dados.valor === 0) {
      throw new AppError('Valor do ajuste deve ser diferente de zero', 400);
    }

    if (tipo !== TipoLancamento.TRANSFERENCIA && dados.contaDestinoId) {
      throw new AppError('Conta de destino so e permitida em transferencias', 400);
    }

    if (tipo === TipoLancamento.TRANSFERENCIA) {
      if (!dados.contaDestinoId) {
        throw new AppError('Transferencia exige conta de destino', 400);
      }
      if (dados.contaDestinoId === dados.contaOrigemId) {
        throw new AppError('Conta de origem e destino devem ser diferentes', 400);
      }
    }

    const proibidosCategoria =
      tipo === TipoLancamento.TRANSFERENCIA || tipo === TipoLancamento.AJUSTE;
    if (proibidosCategoria && (dados.categoriaId || dados.subcategoriaId)) {
      throw new AppError(`${tipo} nao deve possuir categoria ou subcategoria`, 400);
    }

    if (proibidosCategoria && dados.cartaoId) {
      throw new AppError(`${tipo} nao deve possuir cartao`, 400);
    }
  }

  /** Valida que todas as referencias informadas pertencem a familia. */
  private async validarReferencias(
    familiaId: string,
    dados: Partial<CriarLancamentoDTO> & { contaOrigemId?: string },
  ) {
    if (dados.contaOrigemId) {
      const conta = await contaRepository.findById(dados.contaOrigemId);
      if (!conta || conta.familiaId !== familiaId) {
        throw new AppError('Conta de origem nao encontrada nesta familia', 404);
      }
    }

    if (dados.contaDestinoId) {
      const conta = await contaRepository.findById(dados.contaDestinoId);
      if (!conta || conta.familiaId !== familiaId) {
        throw new AppError('Conta de destino nao encontrada nesta familia', 404);
      }
    }

    if (dados.responsavelId) {
      const membro = await familyRepository.findMembroById(dados.responsavelId);
      if (!membro || membro.familiaId !== familiaId) {
        throw new AppError('Responsavel nao encontrado nesta familia', 404);
      }
    }

    if (dados.categoriaId) {
      const categoria = await categoriaFinanceiraRepository.findById(dados.categoriaId);
      if (!categoria || categoria.familiaId !== familiaId) {
        throw new AppError('Categoria nao encontrada nesta familia', 404);
      }
      if (dados.tipo) {
        const compativel =
          (dados.tipo === TipoLancamento.DESPESA &&
            (categoria.tipo === 'DESPESA' || categoria.tipo === 'AMBOS')) ||
          (dados.tipo === TipoLancamento.RECEITA &&
            (categoria.tipo === 'RECEITA' || categoria.tipo === 'AMBOS'));
        if (!compativel) {
          throw new AppError('Categoria nao compativel com o tipo do lancamento', 400);
        }
      }
    }

    if (dados.subcategoriaId) {
      if (!dados.categoriaId) {
        throw new AppError('Subcategoria exige uma categoria', 400);
      }
      const subcategoria = await subcategoriaRepository.findById(dados.subcategoriaId);
      if (!subcategoria || subcategoria.categoriaId !== dados.categoriaId) {
        throw new AppError('Subcategoria nao pertence a categoria informada', 404);
      }
    }

    if (dados.centroCustoId) {
      const centroCusto = await centroCustoRepository.findById(dados.centroCustoId);
      if (!centroCusto || centroCusto.familiaId !== familiaId) {
        throw new AppError('Centro de custo nao encontrado nesta familia', 404);
      }
    }

    if (dados.cartaoId) {
      const cartao = await cartaoRepository.findById(dados.cartaoId);
      if (!cartao || cartao.familiaId !== familiaId) {
        throw new AppError('Cartao nao encontrado nesta familia', 404);
      }
    }

    if (dados.tagsIds?.length) {
      const tags = await tagRepository.findByIds(dados.tagsIds);
      const todasDaFamilia = tags.length === dados.tagsIds.length && tags.every((t) => t.familiaId === familiaId);
      if (!todasDaFamilia) {
        throw new AppError('Tag nao encontrada nesta familia', 404);
      }
    }
  }

  private mesclar(
    existente: {
      tipo: string;
      titulo: string;
      descricao: string | null;
      valor: Prisma.Decimal;
      moeda: string;
      categoriaId: string | null;
      subcategoriaId: string | null;
      centroCustoId: string | null;
      contaOrigemId: string;
      contaDestinoId: string | null;
      cartaoId: string | null;
      formaPagamento: string | null;
      observacoes: string | null;
      responsavelId: string;
      localizacao: string | null;
      status: string;
      dataHora: Date;
    },
    dto: AtualizarLancamentoDTO,
  ): LancamentoMesclado {
    return {
      tipo: (dto.tipo ?? existente.tipo) as TipoLancamento,
      titulo: dto.titulo ?? existente.titulo,
      descricao: dto.descricao !== undefined ? dto.descricao : existente.descricao,
      valor: dto.valor !== undefined ? dto.valor : Number(existente.valor),
      moeda: (dto.moeda ?? existente.moeda) as Moeda,
      categoriaId: dto.categoriaId !== undefined ? dto.categoriaId : existente.categoriaId,
      subcategoriaId: dto.subcategoriaId !== undefined ? dto.subcategoriaId : existente.subcategoriaId,
      centroCustoId: dto.centroCustoId !== undefined ? dto.centroCustoId : existente.centroCustoId,
      contaOrigemId: dto.contaOrigemId ?? existente.contaOrigemId,
      contaDestinoId: dto.contaDestinoId !== undefined ? dto.contaDestinoId : existente.contaDestinoId,
      cartaoId: dto.cartaoId !== undefined ? dto.cartaoId : existente.cartaoId,
      formaPagamento: (dto.formaPagamento !== undefined
        ? dto.formaPagamento
        : existente.formaPagamento) as FormaPagamento | null,
      observacoes: dto.observacoes !== undefined ? dto.observacoes : existente.observacoes,
      responsavelId: dto.responsavelId ?? existente.responsavelId,
      localizacao: dto.localizacao !== undefined ? dto.localizacao : existente.localizacao,
      status: existente.status as StatusLancamento,
      dataHora: existente.dataHora,
    };
  }

  private montarDataUpdate(dto: AtualizarLancamentoDTO, dataHora: Date): Prisma.LancamentoUncheckedUpdateInput {
    const data: Prisma.LancamentoUncheckedUpdateInput = {};
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    if (dto.descricao !== undefined) data.descricao = dto.descricao;
    if (dto.valor !== undefined) data.valor = dto.valor;
    if (dto.moeda !== undefined) data.moeda = dto.moeda;
    if (dto.categoriaId !== undefined) data.categoriaId = dto.categoriaId;
    if (dto.subcategoriaId !== undefined) data.subcategoriaId = dto.subcategoriaId;
    if (dto.centroCustoId !== undefined) data.centroCustoId = dto.centroCustoId;
    if (dto.contaOrigemId !== undefined) data.contaOrigemId = dto.contaOrigemId;
    if (dto.contaDestinoId !== undefined) data.contaDestinoId = dto.contaDestinoId;
    if (dto.cartaoId !== undefined) data.cartaoId = dto.cartaoId;
    if (dto.formaPagamento !== undefined) data.formaPagamento = dto.formaPagamento;
    if (dto.dataHora !== undefined) data.dataHora = dataHora;
    if (dto.observacoes !== undefined) data.observacoes = dto.observacoes;
    if (dto.responsavelId !== undefined) data.responsavelId = dto.responsavelId;
    if (dto.localizacao !== undefined) data.localizacao = dto.localizacao;
    return data;
  }

  private montarHistoricosDiff(
    lancamentoId: string,
    usuarioId: string,
    existente: unknown,
    dto: AtualizarLancamentoDTO,
    dataHoraNovo: Date,
  ): RegistroHistorico[] {
    const anterior = existente as Record<string, unknown>;
    const registros: RegistroHistorico[] = [];

    for (const campo of CAMPOS_HISTORICO) {
      if (!(campo in dto)) continue;

      const valorNovoBruto = campo === 'dataHora' ? dataHoraNovo : (dto as Record<string, unknown>)[campo];
      const valorAnteriorSerializado = serializarValorHistorico(anterior[campo]);
      const novoValorSerializado = serializarValorHistorico(valorNovoBruto);

      if (valorAnteriorSerializado !== novoValorSerializado) {
        registros.push({
          lancamentoId,
          usuarioId,
          campo: campo.toUpperCase(),
          valorAnterior: valorAnteriorSerializado,
          novoValor: novoValorSerializado,
        });
      }
    }

    return registros;
  }
}

function toNumero(valor?: Prisma.Decimal | null): number {
  return Number(valor ?? 0);
}

export const lancamentoService = new LancamentoService();
