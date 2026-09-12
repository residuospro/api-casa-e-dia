import prisma from '../config/database';
import { Prisma } from '../generated/prisma-client';
import { CriarTarefaDTO, AtualizarTarefaDTO } from '../models/tarefa.model';
import { StatusExecucao } from '../models/enums';

function buildPermissaoWhere(membroId: string, permissao: string): Record<string, unknown> | null {
  if (permissao === 'ADMIN') return null;
  return {
    OR: [
      { criadoPorId: membroId },
      { responsavelAtualId: membroId },
      { participantes: { some: { membroId } } },
    ],
  };
}

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
  execucoes: {
    orderBy: { data: 'asc' as const },
    select: {
      id: true,
      data: true,
      status: true,
      pontosObtidos: true,
      iteracao: true,
      executorId: true,
      concluidoPorId: true,
      concluidoEm: true,
      notificacaoCriada: true,
      notificacaoAtrasada: true,
    },
  },
  ciclo: { select: { id: true, nome: true, iteracao: true } },
  participantes: {
    select: { membroId: true },
  },
  criadoPor: {
    select: { id: true, nome: true, fotoPerfil: true },
  },
};

const tarefaListInclude = {
  execucoes: {
    orderBy: { data: 'asc' as const },
    where: { status: { in: [StatusExecucao.AGENDADA, StatusExecucao.ATRASADA] } },
    select: {
      id: true,
      data: true,
      status: true,
      pontosObtidos: true,
      iteracao: true,
      executorId: true,
    },
  },
  ciclo: { select: { id: true, nome: true, iteracao: true } },
  responsavelAtual: {
    select: {
      id: true,
      nome: true,
      fotoPerfil: true,
      genero: true,
      usuario: {
        select: { id: true },
      },
    },
  },
  participantes: {
    select: {
      membroId: true,
    },
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
    const {
      execucoes,
      atribuirAutomaticamente: _atribuirAutomaticamente,
      recorrencia,
      participantesId,
      ...tarefaData
    } = data;

    return prisma.tarefa.create({
      data: {
        ...tarefaData,
        pontos: tarefaData.pontos ?? 0,
        recorrencia:
          recorrencia === null
            ? Prisma.DbNull
            : recorrencia
              ? (recorrencia as unknown as Prisma.InputJsonObject)
              : undefined,
        execucoes: execucoes
          ? {
              create: execucoes.map((e) => ({
                data: new Date(e.data),
                status: e.status,
                pontosObtidos: e.pontosObtidos,
                ...(e.iteracao !== undefined ? { iteracao: e.iteracao } : {}),
                ...(e.executorId !== undefined ? { executorId: e.executorId } : {}),
              })),
            }
          : undefined,
        participantes:
          participantesId && participantesId.length > 0
            ? {
                create: participantesId.map((membroId) => ({ membroId })),
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
      membroId?: string;
      permissao?: string;
    },
  ) {
    type WhereWithExecucoes = Record<string, unknown> & {
      execucoes?: { some?: Record<string, unknown> };
    };

    const where: WhereWithExecucoes = { familiaId };

    const permissaoWhere =
      options.membroId && options.permissao
        ? buildPermissaoWhere(options.membroId, options.permissao)
        : null;
    if (permissaoWhere) {
      where.AND = [permissaoWhere];
    }
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
        } else if (key === 'cicloId') {
          const ids = arrValue.filter((v) => v !== 'null');
          const hasNull = arrValue.includes('null');

          if (hasNull && ids.length > 0) {
            const orConditions: Record<string, unknown>[] = ids.map((id) => ({ cicloId: id }));
            orConditions.push({ cicloId: null });
            where.OR = [...(Array.isArray(where.OR) ? where.OR : []), ...orConditions];
          } else if (hasNull) {
            where.cicloId = null;
          } else {
            where.cicloId = ids.length === 1 ? ids[0] : { in: ids };
          }
        } else if (key === 'responsavelAtualId') {
          const orConditions: Record<string, unknown>[] = arrValue.map((id) => ({
            responsavelAtualId: id,
          }));
          for (const id of arrValue) {
            orConditions.push({ participantes: { some: { membroId: id } } });
          }
          where.OR = [...(Array.isArray(where.OR) ? where.OR : []), ...orConditions];
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
        include: tarefaListInclude,
        orderBy,
        skip,
        take: options.porPagina,
      }),
      prisma.tarefa.count({ where: where as any }),
    ]);

    return { data, total };
  },

  async update(id: string, data: AtualizarTarefaDTO) {
    const { execucoes, participantesId, ...tarefaData } = data;

    const updateData = cleanUpdateData(tarefaData as unknown as Record<string, unknown>);

    await prisma.tarefa.update({
      where: { id },
      data: updateData,
    });

    if (participantesId !== undefined) {
      await prisma.participanteTarefa.deleteMany({ where: { tarefaId: id } });
      if (participantesId && participantesId.length > 0) {
        await prisma.participanteTarefa.createMany({
          data: participantesId.map((membroId) => ({ tarefaId: id, membroId })),
        });
      }
    }

    if (execucoes) {
      const idsNoDto = execucoes.filter((e) => e.id).map((e) => e.id!);

      if (idsNoDto.length > 0) {
        await prisma.execucaoTarefa.deleteMany({
          where: { tarefaId: id, id: { notIn: idsNoDto } },
        });
      } else {
        await prisma.execucaoTarefa.deleteMany({ where: { tarefaId: id } });
      }

      for (const exec of execucoes) {
        if (exec.id) {
          await prisma.execucaoTarefa.update({
            where: { id: exec.id },
            data: {
              data: new Date(exec.data),
              ...(exec.status !== undefined ? { status: exec.status as any } : {}),
              ...(exec.pontosObtidos !== undefined ? { pontosObtidos: exec.pontosObtidos } : {}),
              ...(exec.iteracao !== undefined ? { iteracao: exec.iteracao } : {}),
              ...(exec.executorId !== undefined ? { executorId: exec.executorId } : {}),
            },
          });
        } else {
          await prisma.execucaoTarefa.create({
            data: {
              tarefaId: id,
              data: new Date(exec.data),
              status: (exec.status ?? StatusExecucao.AGENDADA) as any,
              pontosObtidos: exec.pontosObtidos ?? null,
              ...(exec.iteracao !== undefined ? { iteracao: exec.iteracao } : {}),
              ...(exec.executorId !== undefined ? { executorId: exec.executorId } : {}),
            },
          });
        }
      }
    }

    return prisma.tarefa.findUnique({
      where: { id },
      include: tarefaInclude,
    })!;
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
      select: { id: true, titulo: true, responsavelAtualId: true, cicloIteracao: true },
    });
  },

  findExecucoesByTarefa(tarefaId: string) {
    return prisma.execucaoTarefa.findMany({
      where: { tarefaId },
      orderBy: { data: 'asc' },
    });
  },

  findExecucoesPaginadasByTarefa(tarefaId: string, pagina: number, porPagina: number) {
    const offset = (pagina - 1) * porPagina;
    return prisma.$queryRawUnsafe<
      Array<{
        id: string;
        tarefaId: string;
        data: Date;
        status: StatusExecucao;
        pontosObtidos: number | null;
        concluidoPorId: string | null;
        concluidoEm: Date | null;
        iteracao: number | null;
        executorId: string | null;
        notificacaoCriada: boolean;
        notificacaoAtrasada: boolean;
        criadoEm: Date;
      }>
    >(
      `SELECT "id", "tarefaId", "data", "status", "pontosObtidos", "concluidoPorId", "concluidoEm",
              "iteracao", "executorId", "notificacaoCriada", "notificacaoAtrasada", "criadoEm"
       FROM "execucoes_tarefa"
       WHERE "tarefaId" = $1
       ORDER BY
         CASE
           WHEN "status" = 'ATRASADA' THEN 0
           WHEN "status" = 'AGENDADA' AND "data" <= NOW() + INTERVAL '24 hours' THEN 1
           WHEN "status" = 'PERDIDA' THEN 2
           WHEN "status" = 'AGENDADA' THEN 3
           ELSE 4
         END ASC,
         CASE WHEN "status" IN ('ATRASADA', 'AGENDADA')
           THEN EXTRACT(EPOCH FROM "data")::bigint
           ELSE -EXTRACT(EPOCH FROM "data")::bigint
         END ASC
       LIMIT $2 OFFSET $3`,
      tarefaId,
      porPagina,
      offset,
    );
  },

  countExecucoesByTarefa(tarefaId: string) {
    return prisma.execucaoTarefa.count({ where: { tarefaId } });
  },

  deleteFutureAgendadas(tarefaId: string, desde: Date) {
    return prisma.execucaoTarefa.deleteMany({
      where: {
        tarefaId,
        status: 'AGENDADA',
        data: { gte: desde },
      },
    });
  },

  createExecucoes(
    tarefaId: string,
    execucoes: {
      data: Date;
      status: string;
      iteracao?: number | null;
      executorId?: string | null;
    }[],
  ) {
    return prisma.execucaoTarefa.createMany({
      data: execucoes.map((e) => ({
        tarefaId,
        data: e.data,
        status: e.status as any,
        ...(e.iteracao !== undefined ? { iteracao: e.iteracao } : {}),
        ...(e.executorId !== undefined ? { executorId: e.executorId } : {}),
      })),
    } as any);
  },

  updateResponsavel(tarefaId: string, membroId: string, cicloIteracao?: number) {
    return prisma.tarefa.update({
      where: { id: tarefaId },
      data: {
        responsavelAtualId: membroId,
        ...(cicloIteracao !== undefined ? { cicloIteracao } : {}),
      },
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
      executorId?: string | null;
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

  async marcarExecucoesPerdidasPorFamilia(familiaId: string) {
    const atrasadas = await prisma.execucaoTarefa.findMany({
      where: { status: 'ATRASADA', tarefa: { familiaId } },
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

  countTarefasAtivasByCicloGroupByResponsavel(cicloId: string) {
    return prisma.tarefa.groupBy({
      by: ['responsavelAtualId'],
      where: { cicloId, ativo: true, responsavelAtualId: { not: null } },
      _count: { id: true },
    });
  },

  findUrgentesByFamilia(familiaId: string, membroId?: string, permissao?: string) {
    const agora = new Date();

    const permissaoWhere = membroId && permissao ? buildPermissaoWhere(membroId, permissao) : null;

    return prisma.tarefa.findMany({
      where: {
        familiaId,
        ativo: true,
        execucoes: {
          some: {
            OR: [{ status: 'ATRASADA' }, { status: 'AGENDADA', data: { gte: agora } }],
          },
        },
        ...(permissaoWhere ? { AND: [permissaoWhere] } : {}),
      },
      include: {
        execucoes: {
          where: {
            OR: [{ status: 'ATRASADA' }, { status: 'AGENDADA', data: { gte: agora } }],
          },
          orderBy: { data: 'asc' },
        },
        ciclo: { select: { id: true, nome: true, iteracao: true } },
        responsavelAtual: responsavelAtualInclude,
        criadoPor: {
          select: { id: true, nome: true, fotoPerfil: true },
        },
      },
    });
  },

  countByFamilia(familiaId: string) {
    return prisma.tarefa.count({
      where: { familiaId, ativo: true },
    });
  },

  countTarefasDoDia(familiaId: string, membroId?: string, permissao?: string) {
    const hoje = new Date();
    const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

    const permissaoWhere = membroId && permissao ? buildPermissaoWhere(membroId, permissao) : null;

    return prisma.tarefa.count({
      where: {
        familiaId,
        ativo: true,
        execucoes: {
          some: {
            OR: [
              { status: StatusExecucao.ATRASADA },
              {
                status: StatusExecucao.AGENDADA,
                data: { gte: inicioDoDia, lt: fimDoDia },
              },
            ],
          },
        },
        ...(permissaoWhere ? { AND: [permissaoWhere] } : {}),
      },
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

  countExecucoesByFamiliaAndStatus(
    familiaId: string,
    status: StatusExecucao,
    membroId?: string,
    permissao?: string,
  ) {
    const permissaoWhere = membroId && permissao ? buildPermissaoWhere(membroId, permissao) : null;

    return prisma.execucaoTarefa.count({
      where: {
        status,
        tarefa: {
          familiaId,
          ativo: true,
          ...(permissaoWhere ? { AND: [permissaoWhere] } : {}),
        },
      },
    });
  },

  findTarefasComRecorrencia() {
    return prisma.tarefa.findMany({
      where: {
        ativo: true,
        recorrencia: { not: Prisma.DbNull },
      },
      select: {
        id: true,
        recorrencia: true,
        cicloId: true,
        cicloIteracao: true,
        ciclo: {
          select: {
            inicio: true,
            duracaoDias: true,
            proximaRenovacao: true,
          },
        },
      },
    });
  },

  countExecucoesFuturas(tarefaId: string, desde: Date) {
    return prisma.execucaoTarefa.count({
      where: {
        tarefaId,
        status: 'AGENDADA',
        data: { gte: desde },
      },
    });
  },

  findUltimaExecucaoFutura(tarefaId: string, desde: Date) {
    return prisma.execucaoTarefa.findFirst({
      where: {
        tarefaId,
        status: 'AGENDADA',
        data: { gte: desde },
      },
      orderBy: { data: 'desc' },
      select: { data: true },
    });
  },
};
