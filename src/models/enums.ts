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
