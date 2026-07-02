import prisma from '../config/database';
import { CriarTarefaDTO, AtualizarTarefaDTO } from '../models/tarefa.model';

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

function cleanUpdateData(data: Record<string, unknown>): Record<string, unknown> {
  const nullableFields = new Set(['cicloId', 'descricao', 'modoDistribuicao', 'responsavelAtualId']);
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
    const { agendamentos, ...tarefaData } = data;

    return prisma.tarefa.create({
      data: {
        ...tarefaData,
        pontos: tarefaData.pontos ?? 0,
        agendamentos: agendamentos
          ? { create: agendamentos }
          : undefined,
      },
      include: {
        agendamentos: true,
        ciclo: { select: { id: true, nome: true } },
        responsavelAtual: responsavelAtualInclude,
        criadoPor: {
          select: { id: true, nome: true },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.tarefa.findUnique({
      where: { id },
      include: {
        agendamentos: { orderBy: { diaSemana: 'asc' } },
        ciclo: { select: { id: true, nome: true } },
        responsavelAtual: responsavelAtualInclude,
        criadoPor: {
          select: { id: true, nome: true, fotoPerfil: true },
        },
      },
    });
  },

  findByFamilia(familiaId: string) {
    return prisma.tarefa.findMany({
      where: { familiaId, ativo: true },
      include: {
        agendamentos: { orderBy: { diaSemana: 'asc' } },
        ciclo: { select: { id: true, nome: true } },
        responsavelAtual: responsavelAtualInclude,
        criadoPor: {
          select: { id: true, nome: true, fotoPerfil: true },
        },
      },
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
    const where: Record<string, unknown> = { familiaId };

    if (options.filtro) {
      for (const [key, value] of Object.entries(options.filtro)) {
        if (!value || (Array.isArray(value) && value.length === 0)) continue;

        const arrValue = Array.isArray(value) ? value : [value];

        if (key === 'titulo' || key === 'descricao') {
          where[key] = { contains: arrValue[0], mode: 'insensitive' };
        } else if (key === 'ativo') {
          where[key] = arrValue[0] === 'true';
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

    const orderBy = options.ordenacao && options.ordenacao.length > 0
      ? options.ordenacao.map((o) => {
          const rel = relationOrderFields[o.coluna];
          return rel ? { [rel.relation]: { [rel.field]: o.direcao } } : { [o.coluna]: o.direcao };
        })
      : [{ criadoEm: 'desc' as const }];

    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.tarefa.findMany({
        where: where as any,
        include: {
          agendamentos: { orderBy: { diaSemana: 'asc' } },
          ciclo: { select: { id: true, nome: true } },
          responsavelAtual: responsavelAtualInclude,
          criadoPor: {
            select: { id: true, nome: true, fotoPerfil: true },
          },
        },
        orderBy,
        skip,
        take: options.porPagina,
      }),
      prisma.tarefa.count({ where: where as any }),
    ]);

    return { data, total };
  },

  update(id: string, data: AtualizarTarefaDTO) {
    const { agendamentos, ...tarefaData } = data;

    return prisma.$transaction(async (tx) => {
      if (agendamentos) {
        await tx.agendamentoTarefa.deleteMany({ where: { tarefaId: id } });
      }

      return tx.tarefa.update({
        where: { id },
        data: {
          ...cleanUpdateData(tarefaData),
          agendamentos: agendamentos
            ? { create: agendamentos }
            : undefined,
        },
        include: {
          agendamentos: { orderBy: { diaSemana: 'asc' } },
          ciclo: { select: { id: true, nome: true } },
          responsavelAtual: responsavelAtualInclude,
          criadoPor: {
            select: { id: true, nome: true, fotoPerfil: true },
          },
        },
      });
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

  createExecucao(data: {
    tarefaId: string;
    membroId: string;
    dataExecucao: Date;
    observacao?: string;
    pontosGerados: number;
  }) {
    return prisma.execucaoTarefa.create({ data });
  },

  findGamificacaoAtiva(familiaId: string) {
    return prisma.gamificacao.findFirst({
      where: { familiaId, ativo: true },
    });
  },

  findRanking(familiaId: string) {
    return prisma.execucaoTarefa.groupBy({
      by: ['membroId'],
      where: {
        tarefa: { familiaId },
        concluida: true,
      },
      _sum: { pontosGerados: true },
      orderBy: { _sum: { pontosGerados: 'desc' } },
    });
  },

  findMembrosByFamilia(familiaId: string) {
    return prisma.membroFamilia.findMany({
      where: { familiaId },
      select: { id: true, nome: true, fotoPerfil: true },
    });
  },
};
