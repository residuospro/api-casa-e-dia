import prisma from '../config/database';

function inicioDoDia(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

const execucaoInclude = {
  tarefa: {
    include: {
      responsavelAtual: {
        include: {
          usuario: { select: { id: true } },
        },
      },
      familia: {
        include: {
          membros: {
            where: { permissao: 'ADMIN' as const, status: 'ACEITO' as const },
            include: { usuario: { select: { id: true } } },
            take: 1,
          },
        },
      },
    },
  },
};

export const schedulerRepository = {
  findExecucoesVenceHoje() {
    return prisma.execucaoTarefa.findMany({
      where: {
        status: 'AGENDADA',
        data: { gte: inicioDoDia(), lte: fimDoDia() },
        notificacaoCriada: false,
      },
      include: execucaoInclude,
    });
  },

  marcarNotificacaoCriadaBatch(ids: string[]) {
    return prisma.execucaoTarefa.updateMany({
      where: { id: { in: ids } },
      data: { notificacaoCriada: true },
    });
  },

  atualizarExecucoesAtrasadas() {
    return prisma.execucaoTarefa.updateMany({
      where: {
        status: 'AGENDADA',
        data: { lt: inicioDoDia() },
      },
      data: { status: 'ATRASADA' },
    });
  },

  findExecucoesAtrasadasParaNotificar() {
    return prisma.execucaoTarefa.findMany({
      where: {
        status: 'ATRASADA',
        notificacaoAtrasada: false,
      },
      include: execucaoInclude,
    });
  },

  marcarNotificacaoAtrasadaBatch(ids: string[]) {
    return prisma.execucaoTarefa.updateMany({
      where: { id: { in: ids } },
      data: { notificacaoAtrasada: true },
    });
  },
};
