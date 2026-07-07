import prisma from '../config/database';
import { CriarTarefaDTO, AtualizarTarefaDTO, AtualizarExecucaoDTO } from '../models/tarefa.model';
import { StatusExecucao } from '../models/enums';

const responsavelAtualInclude = {
  select: {
    id: true,
    nome: true,
    fotoPerfil: true,
    genero: true,
    usuario: {
      select: { id: true, nome: true, fotoPerfil: true, genero: true },
    },
  },
};

const tarefaInclude = {
  execucoes: { orderBy: { data: 'asc' as const } },
  ciclo: { select: { id: true, nome: true } },
  responsavelAtual: responsavelAtualInclude,
  criadoPor: {
    select: { id: true, nome: true, fotoPerfil: true },
  },
};

function cleanUpdateData(data: Record<string, unknown>): Record<string, unknown> {
  const nullableFields = new Set([
    'cicloId',
    'descricao',
    'modoDistribuicao',
    'responsavelAtualId',
  ]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value === null && !nullableFields.has(key)) continue;
    result[key] = value;
  }
  return result;
}

export const tarefaRepository = {
  create(data: CriarTarefaDTO & { criadoPorId: string }) {
    const { execucoes, ...tarefaData } = data;

    return prisma.tarefa.create({
      data: {
        ...tarefaData,
        pontos: tarefaData.pontos ?? 0,
        execucoes: execucoes
          ? {
              create: execucoes.map((e) => ({
                data: new Date(e.data),
                status: e.status,
                pontosObtidos: e.pontosObtidos,
              })),
            }
          : undefined,
      },
      include: tarefaInclude,
    });
  },

  findById(id: string) {
    return prisma.tarefa.findUnique({
      where: { id },
      include: tarefaInclude,
    });
  },

  findByFamilia(familiaId: string) {
    return prisma.tarefa.findMany({
      where: { familiaId, ativo: true },
      include: tarefaInclude,
      orderBy: { criadoEm: 'desc' },
    });
  },

  async findByFamiliaWithFilters(
    familiaId: string,
    options: {
      filtro?: Record<string, string | string[]>;
      ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[];
      pagina: number;
      porPagina: number;
    },
  ) {
    type WhereWithExecucoes = Record<string, unknown> & {
      execucoes?: { some?: Record<string, unknown> };
    };

    const where: WhereWithExecucoes = { familiaId };
    if (options.filtro) {
      for (const [key, value] of Object.entries(options.filtro)) {
        if (!value || (Array.isArray(value) && value.length === 0)) continue;

        const arrValue = Array.isArray(value) ? value : [value];

        if (key === 'busca') {
          where.OR = [
            {
              titulo: {
                contains: arrValue[0],
                mode: 'insensitive',
              },
            },
            {
              descricao: {
                contains: arrValue[0],
                mode: 'insensitive',
              },
            },
          ];
        } else if (key === 'ativo') {
          where[key] = arrValue[0] === 'true';
        } else if (key === 'dataInicial' || key === 'dataFinal') {
          const dataFilter: Record<string, Date> = {};

          if (options.filtro.dataInicial) {
            dataFilter.gte = new Date(options.filtro.dataInicial as string);
          }

          if (options.filtro.dataFinal) {
            dataFilter.lte = new Date(options.filtro.dataFinal as string);
          }

          where.execucoes ??= { some: {} };

          where.execucoes.some = {
            ...where.execucoes.some,
            data: dataFilter,
          };
        } else if (key === 'status') {
          where.execucoes ??= { some: {} };

          where.execucoes.some = {
            ...where.execucoes.some,
            status: {
              in: arrValue,
            },
          };
        } else {
          where[key] = arrValue.length === 1 ? arrValue[0] : { in: arrValue };
        }
      }
    }

    if (!('ativo' in where)) {
      where.ativo = true;
    }

    const relationOrderFields: Record<string, { relation: string; field: string }> = {
      responsavelAtual: { relation: 'responsavelAtual', field: 'nome' },
    };

    const orderBy =
      options.ordenacao && options.ordenacao.length > 0
        ? options.ordenacao.map((o) => {
            const rel = relationOrderFields[o.coluna];
            return rel ? { [rel.relation]: { [rel.field]: o.direcao } } : { [o.coluna]: o.direcao };
          })
        : [{ criadoEm: 'desc' as const }];

    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.tarefa.findMany({
        where: where as any,
        include: tarefaInclude,
        orderBy,
        skip,
        take: options.porPagina,
      }),
      prisma.tarefa.count({ where: where as any }),
    ]);

    return { data, total };
  },

  update(id: string, data: AtualizarTarefaDTO) {
    const { execucoes, ...tarefaData } = data;

    const updateData = cleanUpdateData(tarefaData as unknown as Record<string, unknown>);

    if (execucoes) {
      updateData.execucoes = {
        deleteMany: {},
        create: execucoes.map((e) => ({
          data: new Date(e.data),
          status: e.status ?? StatusExecucao.AGENDADA,
          pontosObtidos: e.pontosObtidos ?? null,
        })),
      };
    }

    return prisma.tarefa.update({
      where: { id },
      data: updateData,
      include: tarefaInclude,
    });
  },

  delete(id: string) {
    return prisma.tarefa.delete({ where: { id } });
  },

  findRevezamentoByCiclo(cicloId: string) {
    return prisma.tarefa.findMany({
      where: {
        cicloId,
        modoDistribuicao: 'REVEZAMENTO',
        ativo: true,
      },
      select: { id: true, titulo: true, responsavelAtualId: true },
    });
  },

  updateResponsavel(tarefaId: string, membroId: string) {
    return prisma.tarefa.update({
      where: { id: tarefaId },
      data: { responsavelAtualId: membroId },
    });
  },

  updateExecucao(
    execucaoId: string,
    data: {
      status?: string;
      pontosObtidos?: number | null;
      concluidoPorId?: string | null;
      concluidoEm?: Date | null;
      data?: Date;
    },
  ) {
    return prisma.execucaoTarefa.update({
      where: { id: execucaoId },
      data: data as any,
    });
  },

  findExecucaoById(execucaoId: string) {
    return prisma.execucaoTarefa.findUnique({
      where: { id: execucaoId },
      include: { tarefa: true },
    });
  },

  atualizarExecucoesAtrasadas(familiaId: string) {
    return prisma.execucaoTarefa.updateMany({
      where: {
        status: 'AGENDADA',
        data: { lt: new Date() },
        tarefa: { familiaId },
      },
      data: { status: 'ATRASADA' },
    });
  },

  findGamificacaoAtiva(familiaId: string) {
    return prisma.gamificacao.findFirst({
      where: { familiaId, ativo: true },
    });
  },

  findRanking(familiaId: string) {
    return prisma.execucaoTarefa.groupBy({
      by: ['concluidoPorId'],
      where: {
        status: 'CONCLUIDA',
        tarefa: { familiaId },
      },
      _sum: { pontosObtidos: true },
      orderBy: { _sum: { pontosObtidos: 'desc' } },
    });
  },

  findMembrosByFamilia(familiaId: string) {
    return prisma.membroFamilia.findMany({
      where: { familiaId },
      select: { id: true, nome: true, fotoPerfil: true },
    });
  },

  countByCiclo(cicloId: string) {
    return prisma.tarefa.count({
      where: { cicloId, ativo: true },
    });
  },

  countByCicloAndExecucaoStatus(cicloId: string, status: StatusExecucao) {
    return prisma.tarefa.count({
      where: {
        cicloId,
        ativo: true,
        execucoes: { some: { status } },
      },
    });
  },

  countByFamilia(familiaId: string) {
    return prisma.tarefa.count({
      where: { familiaId, ativo: true },
    });
  },

  countByFamiliaAndExecucaoStatus(familiaId: string, status: StatusExecucao) {
    return prisma.tarefa.count({
      where: {
        familiaId,
        ativo: true,
        execucoes: { some: { status } },
      },
    });
  },
};
