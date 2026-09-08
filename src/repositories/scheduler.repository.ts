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
      participantes: {
        include: {
          membro: {
            include: {
              usuario: { select: { id: true } },
            },
          },
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
  executor: {
    include: {
      usuario: { select: { id: true } },
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
        data: { lt: new Date() },
      },
      data: { status: 'ATRASADA' },
    });
  },

  async marcarExecucoesPerdidas() {
    const atrasadas = await prisma.execucaoTarefa.findMany({
      where: { status: 'ATRASADA' },
      orderBy: [{ data: 'asc' }, { id: 'asc' }],
      select: { id: true, tarefaId: true },
    });

    const porTarefa = new Map<string, string[]>();
    for (const e of atrasadas) {
      const lista = porTarefa.get(e.tarefaId) ?? [];
      lista.push(e.id);
      porTarefa.set(e.tarefaId, lista);
    }

    const idsPerdidas: string[] = [];
    for (const ids of porTarefa.values()) {
      if (ids.length > 1) {
        idsPerdidas.push(...ids.slice(0, -1));
      }
    }

    if (idsPerdidas.length === 0) return { count: 0 };

    const resultado = await prisma.execucaoTarefa.updateMany({
      where: { id: { in: idsPerdidas } },
      data: { status: 'PERDIDA' },
    });

    return { count: resultado.count };
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
