import { lancamentoRepository } from '../../repositories/financeiro/lancamento.repository';
import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { categoriaFinanceiraRepository } from '../../repositories/financeiro/categoria-financeira.repository';
import { metaFinanceiraRepository } from '../../repositories/financeiro/meta-financeira.repository';
import { familyRepository } from '../../repositories/family.repository';
import { orcamentoService } from './orcamento.service';
import { calcularDeltasImpacto, usaCartaoCredito } from './lancamento.regras';
import {
  StatusLancamento,
  StatusMetaFinanceira,
  TipoLancamento,
  FormaPagamento,
  Moeda,
} from '../../models/enums';
import { GranularidadePeriodo } from '../../models/financeiro/lancamento.model';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNumero(valor: unknown): number {
  return Number(valor ?? 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Converte uma data "inclusiva" (raio dia, ex. "2026-08-31" -> meia-noite UTC)
 *  no limite exclusivo do dia seguinte (ex. 2026-09-01T00:00:00Z), em UTC.
 *  Assim um lancamento registrado em qualquer hora do ultimo dia e incluido. */
function fimExclusivo(fim: Date): Date {
  const d = new Date(fim.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function chavePeriodo(data: Date, granularidade: GranularidadePeriodo): string {
  const base = data.toISOString().slice(0, 10);
  return granularidade === 'MES' ? base.slice(0, 7) : base;
}

function inicioPeriodo(data: Date, granularidade: GranularidadePeriodo): Date {
  const d = new Date(data);
  if (granularidade === 'DIA') {
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (granularidade === 'SEMANA') {
    d.setUTCHours(0, 0, 0, 0);
    const dia = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (dia === 0 ? -6 : 1 - dia));
    return d;
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function proximoPeriodo(data: Date, granularidade: GranularidadePeriodo): Date {
  const d = new Date(data);
  if (granularidade === 'DIA') d.setUTCDate(d.getUTCDate() + 1);
  else if (granularidade === 'SEMANA') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

function chaveMes(data: Date): string {
  return `${data.getUTCFullYear()}-${pad2(data.getUTCMonth() + 1)}`;
}

/** Avanca uma chave "YYYY-MM" em um mes. */
function proximoMeschave(chave: string): string {
  const [ano, mes] = chave.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, 1));
  data.setUTCMonth(data.getUTCMonth() + 1);
  return chaveMes(data);
}

interface BucketFluxo {
  receitas: number;
  despesas: number;
  quantidade: number;
  realizadoReceitas: number;
  realizadoDespesas: number;
  previstoReceitas: number;
  previstoDespesas: number;
}

interface FluxoItem {
  moeda: Moeda;
  serie: {
    periodo: string;
    receitas: number;
    despesas: number;
    saldo: number;
    quantidade: number;
    realizado: { receitas: number; despesas: number };
    previsto: { receitas: number; despesas: number };
  }[];
  totais: {
    receitas: number;
    despesas: number;
    saldo: number;
    realizadoReceitas: number;
    realizadoDespesas: number;
    previstoReceitas: number;
    previstoDespesas: number;
  };
}

function metaComProgresso(meta: {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: unknown;
  valorObjetivo: unknown;
  valorAtual: unknown;
  dataLimite: Date | null;
  status: unknown;
  contaDestino: { id: string; nome: string; cor: string | null; icone: string | null } | null;
}) {
  const valorObjetivo = toNumero(meta.valorObjetivo);
  const valorAtual = toNumero(meta.valorAtual);
  const percentual = valorObjetivo > 0 ? arredondar2((valorAtual / valorObjetivo) * 100) : 0;
  return {
    ...meta,
    valorObjetivo: arredondar2(valorObjetivo),
    valorAtual: arredondar2(valorAtual),
    percentualConcluido: Math.min(100, Math.max(0, percentual)),
    valorRestante: arredondar2(Math.max(0, valorObjetivo - valorAtual)),
  };
}

export class DashboardService {
  /**
   * Fluxo de caixa por periodo (DIA/SEMANA/MES). Receitas e despesas consideram
   * PAGO + PENDENTE (mesma regra do resumo de lancamentos); os campos realizado e
   * previsto separam o que ja foi pago do que ainda esta pendente. Series sao
   * agrupadas por moeda e lacunas sao preenchidas com zero.
   */
  async fluxoCaixa(
    familiaId: string,
    inicio: Date,
    fim: Date,
    granularidade: GranularidadePeriodo,
  ) {
    const linhas = await lancamentoRepository.fluxoPorPeriodo(
      familiaId,
      inicio,
      fimExclusivo(fim),
      granularidade,
    );

    const buckets = new Map<string, Map<string, BucketFluxo>>();
    for (const linha of linhas) {
      const moeda = linha.moeda as Moeda;
      const porChave = buckets.get(moeda) ?? new Map<string, BucketFluxo>();
      const chave = chavePeriodo(linha.periodo, granularidade);
      const atual = porChave.get(chave) ?? {
        receitas: 0,
        despesas: 0,
        quantidade: 0,
        realizadoReceitas: 0,
        realizadoDespesas: 0,
        previstoReceitas: 0,
        previstoDespesas: 0,
      };

      const receitas = toNumero(linha.receitas);
      const despesas = toNumero(linha.despesas);
      const pagamento = linha.status === StatusLancamento.PAGO || linha.status === StatusLancamento.RECEBIDO;

      atual.receitas += receitas;
      atual.despesas += despesas;
      atual.quantidade += Number(linha.quantidade);
      if (pagamento) {
        atual.realizadoReceitas += receitas;
        atual.realizadoDespesas += despesas;
      } else {
        atual.previstoReceitas += receitas;
        atual.previstoDespesas += despesas;
      }

      porChave.set(chave, atual);
      buckets.set(moeda, porChave);
    }

    const resultado: FluxoItem[] = [];
    for (const [moeda, porChave] of buckets) {
      const serie: FluxoItem['serie'] = [];
      for (
        let data = inicioPeriodo(inicio, granularidade);
        data <= fim;
        data = proximoPeriodo(data, granularidade)
      ) {
        const chave = chavePeriodo(data, granularidade);
        const b = porChave.get(chave) ?? {
          receitas: 0,
          despesas: 0,
          quantidade: 0,
          realizadoReceitas: 0,
          realizadoDespesas: 0,
          previstoReceitas: 0,
          previstoDespesas: 0,
        };
        serie.push({
          periodo: chave,
          receitas: arredondar2(b.receitas),
          despesas: arredondar2(b.despesas),
          saldo: arredondar2(b.receitas - b.despesas),
          quantidade: b.quantidade,
          realizado: {
            receitas: arredondar2(b.realizadoReceitas),
            despesas: arredondar2(b.realizadoDespesas),
          },
          previsto: {
            receitas: arredondar2(b.previstoReceitas),
            despesas: arredondar2(b.previstoDespesas),
          },
        });
      }

      const totais = serie.reduce(
        (acc, i) => {
          acc.receitas += i.receitas;
          acc.despesas += i.despesas;
          acc.saldo += i.saldo;
          acc.realizadoReceitas += i.realizado.receitas;
          acc.realizadoDespesas += i.realizado.despesas;
          acc.previstoReceitas += i.previsto.receitas;
          acc.previstoDespesas += i.previsto.despesas;
          return acc;
        },
        {
          receitas: 0,
          despesas: 0,
          saldo: 0,
          realizadoReceitas: 0,
          realizadoDespesas: 0,
          previstoReceitas: 0,
          previstoDespesas: 0,
        },
      );

      resultado.push({
        moeda: moeda as Moeda,
        serie,
        totais: {
          receitas: arredondar2(totais.receitas),
          despesas: arredondar2(totais.despesas),
          saldo: arredondar2(totais.saldo),
          realizadoReceitas: arredondar2(totais.realizadoReceitas),
          realizadoDespesas: arredondar2(totais.realizadoDespesas),
          previstoReceitas: arredondar2(totais.previstoReceitas),
          previstoDespesas: arredondar2(totais.previstoDespesas),
        },
      });
    }

    return {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      granularidade,
      porMoeda: resultado.sort((a, b) => a.moeda.localeCompare(b.moeda)),
    };
  }

  /**
   * Evolucao do patrimonio por moeda a partir do saldoInicial das contas mais o
   * efeito acumulado dos lancamentos PAGO (mesma regra de calcularDeltasImpacto).
   */
  async evolucaoPatrimonio(familiaId: string, meses: number) {
    const agora = new Date();
    const fim = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1));
    const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - (meses - 1), 1));

    const [contas, pagos] = await Promise.all([
      contaRepository.findByFamilia(familiaId),
      lancamentoRepository.pagosNoPeriodo(familiaId, inicio, fim),
    ]);

    const contasPorId = new Map(
      contas.map((conta) => [
        conta.id,
        {
          moeda: conta.moeda as Moeda,
          saldoInicial: toNumero(conta.saldoInicial),
          inicioChave: chaveMes(conta.criadoEm),
        },
      ]),
    );

    const deltasPorConta = new Map<string, Map<string, number>>();
    for (const id of contasPorId.keys()) deltasPorConta.set(id, new Map());

    for (const pagamento of pagos) {
      const estado = {
        tipo: pagamento.tipo as TipoLancamento,
        valor: toNumero(pagamento.valor),
        status: StatusLancamento.PAGO,
        contaOrigemId: pagamento.contaOrigemId,
        contaDestinoId: pagamento.contaDestinoId,
        afetaConta: !usaCartaoCredito({
          tipo: pagamento.tipo as TipoLancamento,
          cartaoId: pagamento.cartaoId,
          formaPagamento: pagamento.formaPagamento as FormaPagamento | null,
        }),
        coberto: !!pagamento.orcamentoId,
      };
      const chaveMesPagamento = chaveMes(pagamento.dataHora);

      for (const delta of calcularDeltasImpacto(estado)) {
        const porMes = deltasPorConta.get(delta.contaId);
        if (!porMes) continue;
        porMes.set(
          chaveMesPagamento,
          arredondar2((porMes.get(chaveMesPagamento) ?? 0) + delta.delta),
        );
      }
    }

    const porMoeda = new Map<
      Moeda,
      { serie: { ano: number; mes: number; patrimonio: number }[]; patrimonioAtual: number }
    >();
    for (const conta of contasPorId.values()) {
      if (!porMoeda.has(conta.moeda)) porMoeda.set(conta.moeda, { serie: [], patrimonioAtual: 0 });
    }

    for (let data = new Date(inicio); data < fim; data = proximoPeriodo(data, 'MES')) {
      const mesChave = chaveMes(data);
      const porMoedaNoMes = new Map<Moeda, number>();

      for (const [contaId, conta] of contasPorId) {
        if (mesChave < conta.inicioChave) continue;
        const porMes = deltasPorConta.get(contaId) ?? new Map<string, number>();
        let acumulado = toNumero(conta.saldoInicial);
        for (let cursor = conta.inicioChave; cursor <= mesChave; cursor = proximoMeschave(cursor)) {
          acumulado += porMes.get(cursor) ?? 0;
        }
        porMoedaNoMes.set(conta.moeda, (porMoedaNoMes.get(conta.moeda) ?? 0) + acumulado);
      }

      for (const [moeda, patrimonio] of porMoedaNoMes) {
        const item = porMoeda.get(moeda)!;
        item.serie.push({
          ano: data.getUTCFullYear(),
          mes: data.getUTCMonth() + 1,
          patrimonio: arredondar2(patrimonio),
        });
        item.patrimonioAtual = arredondar2(patrimonio);
      }
    }

    return {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      meses,
      porMoeda: [...porMoeda.entries()]
        .map(([moeda, dados]) => ({ moeda, ...dados }))
        .sort((a, b) => a.moeda.localeCompare(b.moeda)),
    };
  }

  /** Saida financeira agrupada por categoria e moeda (somente despesas). */
  async despesasPorCategoria(familiaId: string, inicio: Date, fim: Date) {
    const linhas = await lancamentoRepository.despesasPorCategoriaMoeda(
      familiaId,
      inicio,
      fimExclusivo(fim),
    );

    const totalPorMoeda = new Map<string, number>();
    const porCategoria = new Map<
      string,
      { moeda: Moeda; categoriaId: string | null; valor: number; quantidade: number }
    >();
    for (const linha of linhas) {
      const moeda = linha.moeda as Moeda;
      const valor = toNumero(linha._sum.valor);
      totalPorMoeda.set(moeda, (totalPorMoeda.get(moeda) ?? 0) + valor);
      const chave = `${moeda}|${linha.categoriaId ?? '__sem_categoria__'}`;
      const atual = porCategoria.get(chave) ?? {
        moeda,
        categoriaId: linha.categoriaId,
        valor: 0,
        quantidade: 0,
      };
      atual.valor += valor;
      atual.quantidade += linha._count._all;
      porCategoria.set(chave, atual);
    }

    const idsCategorias = [...porCategoria.values()]
      .map((c) => c.categoriaId)
      .filter((id): id is string => id !== null);
    const categorias = idsCategorias.length
      ? await categoriaFinanceiraRepository.findByIds(idsCategorias)
      : [];
    const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));

    const itens = [...porCategoria.values()]
      .map((item) => {
        const categoria = item.categoriaId ? (mapaCategorias.get(item.categoriaId) ?? null) : null;
        const total = totalPorMoeda.get(item.moeda) ?? 0;
        return {
          categoria: categoria
            ? { id: categoria.id, nome: categoria.nome, cor: categoria.cor, icone: categoria.icone }
            : null,
          moeda: item.moeda,
          valor: arredondar2(item.valor),
          percentual: total > 0 ? arredondar2((item.valor / total) * 100) : 0,
          quantidade: item.quantidade,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    return {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      totais: [...totalPorMoeda.entries()]
        .map(([moeda, total]) => ({ moeda: moeda as Moeda, total: arredondar2(total) }))
        .sort((a, b) => a.moeda.localeCompare(b.moeda)),
      porCategoria: itens,
    };
  }

  /** Progresso das metas financeiras (em andamento + ultimas concluidas). */
  async metasProgresso(familiaId: string) {
    const [emAndamento, concluidas, contagem] = await Promise.all([
      metaFinanceiraRepository.findByFamiliaStatusIn(familiaId, [
        StatusMetaFinanceira.EM_ANDAMENTO,
      ]),
      metaFinanceiraRepository.findByFamiliaStatusIn(
        familiaId,
        [StatusMetaFinanceira.CONCLUIDA],
        5,
      ),
      metaFinanceiraRepository.countByStatus(familiaId),
    ]);

    const quantidades: Record<StatusMetaFinanceira, number> = {
      [StatusMetaFinanceira.EM_ANDAMENTO]: 0,
      [StatusMetaFinanceira.CONCLUIDA]: 0,
      [StatusMetaFinanceira.CANCELADA]: 0,
    };
    for (const item of contagem) {
      quantidades[item.status as StatusMetaFinanceira] = item._count._all;
    }

    const todas = [...emAndamento, ...concluidas];
    const metas = todas
      .map(metaComProgresso)
      .sort((a, b) => b.percentualConcluido - a.percentualConcluido);

    let valorObjetivo = 0;
    let valorAtual = 0;
    for (const meta of todas) {
      valorObjetivo += toNumero(meta.valorObjetivo);
      valorAtual += toNumero(meta.valorAtual);
    }

    return {
      resumo: {
        total: Object.values(quantidades).reduce((a, b) => a + b, 0),
        emAndamento: quantidades[StatusMetaFinanceira.EM_ANDAMENTO],
        concluidas: quantidades[StatusMetaFinanceira.CONCLUIDA],
        canceladas: quantidades[StatusMetaFinanceira.CANCELADA],
        valorObjetivo: arredondar2(valorObjetivo),
        valorAtual: arredondar2(valorAtual),
        percentualGlobal: valorObjetivo > 0 ? arredondar2((valorAtual / valorObjetivo) * 100) : 0,
      },
      metas,
    };
  }

  /** Resumo consolidado dos orcamentos de um mes (reusa a regra de indicador). */
  async orcamentosResumo(familiaId: string, mes: number, ano: number) {
    return orcamentoService.resumo(familiaId, mes, ano);
  }

  /** Saldo das contas por moeda (atual, previsto e previsao). */
  async saldoContas(familiaId: string) {
    const contas = await contaRepository.findByFamilia(familiaId);

    const itens = contas.map((conta) => {
      const saldoAtual = toNumero(conta.saldoAtual);
      const saldoPrevisto = toNumero(conta.saldoPrevisto);
      return {
        id: conta.id,
        nome: conta.nome,
        instituicao: conta.instituicao,
        tipo: conta.tipo,
        moeda: conta.moeda as Moeda,
        cor: conta.cor,
        icone: conta.icone,
        saldoAtual: arredondar2(saldoAtual),
        saldoPrevisto: arredondar2(saldoPrevisto),
        previsao: arredondar2(saldoPrevisto - saldoAtual),
      };
    });

    const totaisPorMoeda = new Map<
      string,
      { saldoAtual: number; saldoPrevisto: number; previsao: number }
    >();
    for (const item of itens) {
      const atual = totaisPorMoeda.get(item.moeda) ?? {
        saldoAtual: 0,
        saldoPrevisto: 0,
        previsao: 0,
      };
      atual.saldoAtual += item.saldoAtual;
      atual.saldoPrevisto += item.saldoPrevisto;
      atual.previsao += item.previsao;
      totaisPorMoeda.set(item.moeda, atual);
    }

    return {
      contas: itens,
      totaisPorMoeda: [...totaisPorMoeda.entries()]
        .map(([moeda, valores]) => ({
          moeda: moeda as Moeda,
          saldoAtual: arredondar2(valores.saldoAtual),
          saldoPrevisto: arredondar2(valores.saldoPrevisto),
          previsao: arredondar2(valores.previsao),
        }))
        .sort((a, b) => a.moeda.localeCompare(b.moeda)),
    };
  }

  /** Saida financeira por responsavel (somente despesas), com percentual por moeda. */
  async gastosPorResponsavel(familiaId: string, inicio: Date, fim: Date) {
    const linhas = await lancamentoRepository.porResponsavel(
      familiaId,
      inicio,
      fimExclusivo(fim),
    );

    const ids = [...new Set(linhas.map((l) => l.responsavelId))];
    const membros = ids.length ? await familyRepository.findMembrosByIds(ids) : [];
    const mapaMembros = new Map(membros.map((m) => [m.id, m]));

    const totais = new Map<string, number>();
    for (const linha of linhas) {
      const moeda = linha.moeda as Moeda;
      totais.set(moeda, (totais.get(moeda) ?? 0) + toNumero(linha._sum.valor));
    }

    const porResponsavel = linhas
      .map((linha) => {
        const moeda = linha.moeda as Moeda;
        const valor = toNumero(linha._sum.valor);
        const membro = mapaMembros.get(linha.responsavelId);
        return {
          responsavel: membro
            ? { id: membro.id, nome: membro.nome }
            : { id: linha.responsavelId, nome: null },
          moeda,
          total: arredondar2(valor),
          quantidade: linha._count._all,
          percentual:
            (totais.get(moeda) ?? 0) > 0
              ? arredondar2((valor / (totais.get(moeda) ?? 0)) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      porResponsavel,
      totais: [...totais.entries()]
        .map(([moeda, total]) => ({ moeda: moeda as Moeda, total: arredondar2(total) }))
        .sort((a, b) => a.moeda.localeCompare(b.moeda)),
    };
  }
}

export const dashboardService = new DashboardService();
