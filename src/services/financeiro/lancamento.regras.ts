import { DeltaSaldo } from '../../repositories/financeiro/lancamento.repository';
import { StatusLancamento, TipoLancamento, FormaPagamento } from '../../models/enums';

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
// Excecao 1: DESPESA paga com cartao de credito (cartaoId + formaPagamento CREDITO)
// nao altera o saldo da conta vinculada. O impacto na fatura do cartao sera
// tratado em modulo futuro.
//
// Excecao 2: DESPESA coberta por um orcamento (coberto = true) nao altera o saldo
// da conta: o valor consome o orcamento da categoria/mes em vez do caixa.

export interface EstadoFinanceiroLancamento {
  tipo: TipoLancamento;
  valor: number;
  status: StatusLancamento;
  contaOrigemId: string;
  contaDestinoId?: string | null;
  afetaConta: boolean;
  coberto?: boolean;
}

export function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function usaCartaoCredito(l: {
  tipo: TipoLancamento;
  cartaoId?: string | null;
  formaPagamento?: FormaPagamento | null;
}): boolean {
  return l.tipo === TipoLancamento.DESPESA && !!l.cartaoId && l.formaPagamento === FormaPagamento.CREDITO;
}

/** Mes/ano (local) do lancamento — chave usada para localizar o orcamento. */
export function obterMesAno(dataHora: Date): { mes: number; ano: number } {
  return { mes: dataHora.getMonth() + 1, ano: dataHora.getFullYear() };
}

/** Status que compoem o consumo do orcamento. */
export function contaParaConsumo(status: StatusLancamento): boolean {
  return status === StatusLancamento.PENDENTE || status === StatusLancamento.PAGO;
}

export function calcularDeltasImpacto(estado: EstadoFinanceiroLancamento): DeltaSaldo[] {
  if (
    !estado.afetaConta ||
    estado.status === StatusLancamento.CANCELADO ||
    estado.status === StatusLancamento.IGNORADO
  ) {
    return [];
  }

  // Despesa coberta por orcamento nao mexe no saldo da conta.
  if (estado.tipo === TipoLancamento.DESPESA && estado.coberto) {
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