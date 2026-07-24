export enum TipoPessoa {
  MARIDO = 'MARIDO',
  ESPOSA = 'ESPOSA',
  FILHO = 'FILHO',
  FILHA = 'FILHA',
  OUTRO = 'OUTRO',
}

export enum Permissao {
  ADMIN = 'ADMIN',
  USUARIO = 'USUARIO',
}

export enum Genero {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
}

export enum NotificacaoTipo {
  CONVITE_FAMILIA = 'CONVITE_FAMILIA',
  CICLO_VENCIDO = 'CICLO_VENCIDO',
  EXECUCAO_TAREFA = 'EXECUCAO_TAREFA',
  TAREFA_ATRIBUIDA = 'TAREFA_ATRIBUIDA',
}

export enum TipoTarefa {
  PESSOAL = 'PESSOAL',
  FAMILIAR = 'FAMILIAR',
}

export enum Categoria {
  CASA = 'CASA',
  ESTUDO = 'ESTUDO',
  SAUDE = 'SAUDE',
  FINANCEIRO = 'FINANCEIRO',
  OUTROS = 'OUTROS',
}

export enum ModoDistribuicao {
  FIXA = 'FIXA',
  REVEZAMENTO = 'REVEZAMENTO',
}

export enum StatusExecucao {
  AGENDADA = 'AGENDADA',
  CONCLUIDA = 'CONCLUIDA',
  ATRASADA = 'ATRASADA',
  CANCELADA = 'CANCELADA',
}

export enum FrequenciaRecorrencia {
  DIARIO = 'DIARIO',
  DIA_SIM_DIA_NAO = 'DIA_SIM_DIA_NAO',
  DIAS_IMPARES = 'DIAS_IMPARES',
  DIAS_PARES = 'DIAS_PARES',
}

// ========== FINANCEIRO ==========

export enum TipoConta {
  CONTA_CORRENTE = 'CONTA_CORRENTE',
  POUPANCA = 'POUPANCA',
  DINHEIRO = 'DINHEIRO',
  INVESTIMENTO = 'INVESTIMENTO',
  CARTEIRA = 'CARTEIRA',
}

export enum Moeda {
  BRL = 'BRL',
  USD = 'USD',
  EUR = 'EUR',
}

export enum TipoLancamento {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  AJUSTE = 'AJUSTE',
}

export enum StatusLancamento {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
  IGNORADO = 'IGNORADO',
}

export enum OrigemLancamento {
  MANUAL = 'MANUAL',
  NOTIFICACAO = 'NOTIFICACAO',
  IA = 'IA',
  IMPORTACAO = 'IMPORTACAO',
  RECORRENCIA = 'RECORRENCIA',
}

export enum FormaPagamento {
  PIX = 'PIX',
  DINHEIRO = 'DINHEIRO',
  DEBITO = 'DEBITO',
  CREDITO = 'CREDITO',
  BOLETO = 'BOLETO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  OUTRO = 'OUTRO',
}

export enum TipoCategoriaFinanceira {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  AMBOS = 'AMBOS',
}

export enum StatusCategoria {
  ATIVA = 'ATIVA',
  ARQUIVADA = 'ARQUIVADA',
}

export enum TipoCartao {
  CREDITO = 'CREDITO',
  DEBITO = 'DEBITO',
  AMBOS = 'AMBOS',
}

export enum FrequenciaRecorrenciaFinanceira {
  DIARIA = 'DIARIA',
  SEMANAL = 'SEMANAL',
  MENSAL = 'MENSAL',
  ANUAL = 'ANUAL',
}

export enum TipoMetaFinanceira {
  ECONOMIA = 'ECONOMIA',
  QUITAR_DIVIDA = 'QUITAR_DIVIDA',
  INVESTIMENTO = 'INVESTIMENTO',
  OBJETIVO = 'OBJETIVO',
}

export enum StatusMetaFinanceira {
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}
