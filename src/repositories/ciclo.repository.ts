import prisma from '../config/database';

export const cicloRepository = {
  create(data: { familiaId: string; nome: string; descricao?: string; duracaoDias: number; ativo?: boolean }) {
    return prisma.ciclo.create({ data });
  },

  findById(id: string) {
    return prisma.ciclo.findUnique({ where: { id } });
  },

  findCicloAtivo(familiaId: string) {
    return prisma.ciclo.findFirst({
      where: { familiaId, ativo: true },
    });
  },

  findCiclosAtivos(familiaId: string) {
    return prisma.ciclo.findMany({
      where: { familiaId, ativo: true },
      orderBy: { criadoEm: 'desc' },
    });
  },

  findByFamilia(familiaId: string) {
    return prisma.ciclo.findMany({
      where: { familiaId },
      orderBy: { criadoEm: 'desc' },
    });
  },

  findCiclosVencidos(familiaId: string) {
    return prisma.$queryRawUnsafe<Array<{
      id: string;
      familiaId: string;
      nome: string;
      duracaoDias: number;
      ativo: boolean;
      inicio: Date;
      ultimaRotacao: Date | null;
      criadoEm: Date;
      atualizadoEm: Date;
    }>>(
      `SELECT * FROM ciclos WHERE "familiaId" = $1 AND ativo = true AND "inicio" + ("duracaoDias"::text || ' days')::interval <= NOW()`,
      familiaId,
    );
  },

  update(id: string, data: {
    nome?: string;
    descricao?: string;
    duracaoDias?: number;
    ativo?: boolean;
    inicio?: Date;
    ultimaRotacao?: Date | null;
  }) {
    return prisma.ciclo.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.ciclo.delete({ where: { id } });
  },
};
