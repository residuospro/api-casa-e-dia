import prisma from '../config/database';

interface CriarSchedulerLog {
  identificador: string;
  nome: string;
  origem: 'AGENDADO' | 'MANUAL';
  status: 'SUCESSO' | 'ERRO';
  iniciadoEm: Date;
  terminadoEm: Date;
  duracaoMs: number;
  detalhes?: Record<string, number>;
  erro?: string;
}

export const schedulerLogRepository = {
  criar(dados: CriarSchedulerLog) {
    return prisma.schedulerLog.create({
      data: {
        identificador: dados.identificador,
        nome: dados.nome,
        origem: dados.origem,
        status: dados.status,
        iniciadoEm: dados.iniciadoEm,
        terminadoEm: dados.terminadoEm,
        duracaoMs: dados.duracaoMs,
        detalhes: dados.detalhes ?? undefined,
        erro: dados.erro,
      },
    });
  },

  async listar(identificador: string, pagina: number, porPagina: number) {
    const [data, total] = await Promise.all([
      prisma.schedulerLog.findMany({
        where: { identificador },
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.schedulerLog.count({ where: { identificador } }),
    ]);

    return {
      data,
      paginacao: {
        pagina,
        por_pagina: porPagina,
        total,
        ultima_pagina: Math.max(1, Math.ceil(total / porPagina)),
      },
    };
  },

  async agregar(identificador: string) {
    const [grupos, ultima] = await Promise.all([
      prisma.schedulerLog.groupBy({
        by: ['status'],
        where: { identificador },
        _count: true,
      }),
      prisma.schedulerLog.findFirst({
        where: { identificador },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    const total = grupos.reduce((acc, g) => acc + g._count, 0);

    return {
      total,
      sucessos: grupos.find((g) => g.status === 'SUCESSO')?._count ?? 0,
      erros: grupos.find((g) => g.status === 'ERRO')?._count ?? 0,
      ultima,
    };
  },
};
