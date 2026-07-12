import { tarefaRepository } from '../repositories/tarefa.repository';
import { familyRepository } from '../repositories/family.repository';
import { cicloRepository } from '../repositories/ciclo.repository';
import { AppError } from './auth.service';
import { TipoTarefa, ModoDistribuicao, StatusExecucao, NotificacaoTipo } from '../models/enums';
import { generateAvatar } from '../utils/avatar';
import {
  CriarTarefaDTO,
  AtualizarTarefaDTO,
} from '../models/tarefa.model';
import { notificationService } from './notification.service';

export async function renovarExecucoesTarefa(
  tarefaId: string,
  iteracao: number | null,
  novoInicio: Date,
  duracaoDias: number,
) {
  const execucoes = await tarefaRepository.findExecucoesByTarefa(tarefaId);

  const naoCanceladas = execucoes.filter((e) => e.status !== 'CANCELADA');
  const novas: { data: Date; status: string; iteracao?: number | null }[] = [];

  if (naoCanceladas.length === 0) {
    novas.push({ data: new Date(novoInicio), status: 'AGENDADA', iteracao });
  } else {
    for (const exec of naoCanceladas) {
      const data = new Date(exec.data.getTime() + duracaoDias * 24 * 60 * 60 * 1000);
      novas.push({ data, status: 'AGENDADA', iteracao });
    }
  }

  await tarefaRepository.createExecucoes(tarefaId, novas);
}

function transformResponsavel(tarefa: any) {
  if (!tarefa.responsavelAtual) return tarefa;
  const r = tarefa.responsavelAtual;
  return {
    ...tarefa,
    responsavelAtual: {
      id: r.id,
      nome: r.nome ?? r.usuario?.nome ?? null,
      fotoPerfil: r.fotoPerfil ?? r.usuario?.fotoPerfil ?? generateAvatar(r.nome ?? r.usuario?.nome ?? 'Sem nome', r.genero ?? r.usuario?.genero ?? null),
      genero: r.genero ?? r.usuario?.genero ?? null,
    },
  };
}

export class TarefaService {
  async criar(dto: CriarTarefaDTO) {
    const familia = await familyRepository.findFamiliaById(dto.familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    if (dto.tipo === TipoTarefa.PESSOAL) {
      if (!dto.responsavelAtualId) {
        throw new AppError('Tarefa pessoal deve ter um responsável', 400);
      }
    }

    let cicloRevezamento: Awaited<ReturnType<typeof cicloRepository.findById>> | null = null;

    if (dto.tipo === TipoTarefa.FAMILIAR) {
      if (dto.modoDistribuicao === ModoDistribuicao.FIXA && !dto.responsavelAtualId) {
        throw new AppError('Tarefa fixa deve ter um responsável', 400);
      }

      if (dto.modoDistribuicao === ModoDistribuicao.REVEZAMENTO) {
        if (!dto.cicloId) {
          throw new AppError('Tarefa de revezamento deve ter um ciclo', 400);
        }

        cicloRevezamento = await cicloRepository.findById(dto.cicloId);
        if (!cicloRevezamento) {
          throw new AppError('Ciclo não encontrado', 404);
        }

        if (dto.atribuirAutomaticamente) {
          const participantes = cicloRevezamento.participantes;
          if (participantes.length === 0) {
            throw new AppError('Ciclo não possui participantes para atribuição automática', 400);
          }

          const membrosAtivos = await familyRepository.findMembrosAtivosByFamilia(dto.familiaId);
          const idsAtivos = new Set(membrosAtivos.map((m) => m.id));
          const participantesValidos = participantes.filter((p) => idsAtivos.has(p));

          if (participantesValidos.length === 0) {
            throw new AppError('Nenhum participante do ciclo é um membro ativo da família', 400);
          }

          const contagem = await tarefaRepository.countTarefasAtivasByCicloGroupByResponsavel(cicloRevezamento.id);
          const mapaContagem = new Map(contagem.map((c) => [c.responsavelAtualId!, c._count.id]));
          const menorCount = Math.min(...participantesValidos.map((p) => mapaContagem.get(p) ?? 0));
          const candidatos = participantesValidos.filter((p) => (mapaContagem.get(p) ?? 0) === menorCount);
          dto.responsavelAtualId = candidatos[Math.floor(Math.random() * candidatos.length)];
        }

        if (dto.responsavelAtualId && !cicloRevezamento.participantes.includes(dto.responsavelAtualId)) {
          throw new AppError('Responsável não faz parte do ciclo', 400);
        }

        if (dto.execucoes && dto.execucoes.length > 0) {
          const referencia = cicloRevezamento.proximaRenovacao
            ? new Date(cicloRevezamento.proximaRenovacao)
            : new Date(cicloRevezamento.inicio.getTime() + cicloRevezamento.duracaoDias * 24 * 60 * 60 * 1000);

          for (const execucao of dto.execucoes) {
            if (execucao.data > referencia) {
              throw new AppError('Execução com data após o vencimento do ciclo', 400);
            }
          }
        }
      }
    }

    const execucoesComIteracao = dto.execucoes?.map((e) => ({
      ...e,
      iteracao: e.iteracao ?? cicloRevezamento?.iteracao ?? null,
    }));

    const tarefa = await tarefaRepository.create({
      ...dto,
      pontos: dto.pontos ?? 0,
      cicloIteracao: cicloRevezamento?.iteracao,
      execucoes: execucoesComIteracao ?? undefined,
    });

    if (dto.responsavelAtualId && dto.responsavelAtualId !== dto.criadoPorId) {
      const membroResponsavel = await familyRepository.findMembroById(dto.responsavelAtualId);
      if (membroResponsavel?.usuario) {
        await notificationService.criar({
          usuarioId: membroResponsavel.usuario.id,
          tipo: NotificacaoTipo.TAREFA_ATRIBUIDA,
          titulo: 'Nova tarefa atribuída',
          mensagem: `Você foi designado(a) para a tarefa "${tarefa.titulo}"`,
          dados: JSON.stringify({ tarefaId: tarefa.id }),
        });
      }
    }

    return transformResponsavel(tarefa);
  }

  async listar(
    familiaId: string,
    options: {
      filtro?: Record<string, string | string[]>;
      ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[];
      pagina: number;
      porPagina: number;
      paginaResposta: number;
      porPaginaResposta: number;
    },
  ) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    await tarefaRepository.atualizarExecucoesAtrasadas(familiaId);

    const filtro = options.filtro ? { ...options.filtro } : {};

    if (filtro.dependente !== undefined) {
      const isDependente = filtro.dependente === 'true';
      delete filtro.dependente;

      const membros = await familyRepository.findMembrosByFamilia(familiaId);
      const ids = membros
        .filter((m: any) => m.dependente === isDependente)
        .map((m: any) => m.id);

      if (ids.length > 0) {
        filtro.responsavelAtualId = ids.length === 1 ? ids[0] : ids;
      } else {
        filtro.responsavelAtualId = 'none';
      }
    }

    const { data, total } = await tarefaRepository.findByFamiliaWithFilters(
      familiaId,
      { filtro, ordenacao: options.ordenacao, pagina: options.pagina, porPagina: options.porPagina },
    );

    const ultimaPagina = Math.ceil(total / options.porPagina);

    return {
      filtro,
      ordenacao: options.ordenacao ?? [{ coluna: 'criadoEm', direcao: 'desc' }],
      paginacao: {
        total: ultimaPagina,
        pagina: options.paginaResposta,
        por_pagina: options.porPaginaResposta,
        ultima_pagina: ultimaPagina,
      },
      data: data.map(transformResponsavel),
    };
  }

  async obter(familiaId: string, tarefaId: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    return transformResponsavel(tarefa);
  }

  async atualizar(familiaId: string, tarefaId: string, dto: AtualizarTarefaDTO) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    if (dto.tipo === TipoTarefa.PESSOAL && !dto.responsavelAtualId) {
      throw new AppError('Tarefa pessoal deve ter um responsável', 400);
    }

    if (
      dto.tipo === TipoTarefa.FAMILIAR &&
      dto.modoDistribuicao === ModoDistribuicao.FIXA &&
      !dto.responsavelAtualId
    ) {
      throw new AppError('Tarefa fixa deve ter um responsável', 400);
    }

    if (dto.execucoes) {
      const execucoesExistentes = await tarefaRepository.findExecucoesByTarefa(tarefaId);
      const iteracaoPorId = new Map(execucoesExistentes.map((e: any) => [e.id, e.iteracao]));

      dto.execucoes = dto.execucoes.map((e) => {
        if (e.id && iteracaoPorId.has(e.id)) {
          return { ...e, iteracao: e.iteracao ?? iteracaoPorId.get(e.id) ?? null };
        }
        return { ...e, iteracao: e.iteracao ?? tarefa.cicloIteracao ?? null };
      });
    }

    const resultado = await tarefaRepository.update(tarefaId, dto);
    return transformResponsavel(resultado);
  }

  async remover(familiaId: string, tarefaId: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    await tarefaRepository.delete(tarefaId);

    return { message: 'Tarefa removida com sucesso' };
  }

  async concluir(familiaId: string, tarefaId: string, execucaoId: string, membroId: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    if (!tarefa.ativo) {
      throw new AppError('Tarefa inativa não pode ser concluída', 400);
    }

    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao || execucao.tarefaId !== tarefaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.status !== StatusExecucao.AGENDADA && execucao.status !== StatusExecucao.ATRASADA) {
      throw new AppError('Execução já foi concluída ou cancelada', 400);
    }

    let pontosObtidos = 0;

    if (tarefa.tipo !== 'PESSOAL') {
      const gamificacao = await tarefaRepository.findGamificacaoAtiva(familiaId);
      if (gamificacao) {
        pontosObtidos = tarefa.pontos;
      }
    }

    await tarefaRepository.updateExecucao(execucaoId, {
      status: StatusExecucao.CONCLUIDA,
      pontosObtidos,
      concluidoPorId: membroId,
      concluidoEm: new Date(),
    });

    return {
      message: 'Tarefa concluída com sucesso',
      pontosGerados: pontosObtidos,
    };
  }

  async concluirExecucao(familiaId: string, execucaoId: string, membroId: string) {
    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.tarefa.familiaId !== familiaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.status !== StatusExecucao.AGENDADA && execucao.status !== StatusExecucao.ATRASADA) {
      throw new AppError('Execução já foi concluída ou cancelada', 400);
    }

    const tarefa = execucao.tarefa;

    const pontosObtidos = tarefa.pontos;

    await tarefaRepository.updateExecucao(execucaoId, {
      status: StatusExecucao.CONCLUIDA,
      pontosObtidos,
      concluidoPorId: membroId,
      concluidoEm: new Date(),
    });

    return {
      message: 'Execução concluída com sucesso',
      pontosGerados: pontosObtidos,
    };
  }

  async cancelarExecucao(familiaId: string, execucaoId: string) {
    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.tarefa.familiaId !== familiaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.status !== StatusExecucao.AGENDADA && execucao.status !== StatusExecucao.ATRASADA) {
      throw new AppError('Execução já foi concluída ou cancelada', 400);
    }

    await tarefaRepository.updateExecucao(execucaoId, {
      status: StatusExecucao.CANCELADA,
    });

    return {
      message: 'Execução cancelada com sucesso',
    };
  }

  async atualizarExecucao(familiaId: string, execucaoId: string, data: Date) {
    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.tarefa.familiaId !== familiaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    await tarefaRepository.updateExecucao(execucaoId, { data });

    return {
      message: 'Data da execução atualizada com sucesso',
    };
  }

  async atualizarExecucoesAtrasadas(familiaId: string) {
    return tarefaRepository.atualizarExecucoesAtrasadas(familiaId);
  }

  async ranking(familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const ranking = await tarefaRepository.findRanking(familiaId);
    const membros = await tarefaRepository.findMembrosByFamilia(familiaId);
    const membroMap = new Map(membros.map((m) => [m.id, m]));

    return ranking.map((item) => {
      const membro = membroMap.get(item.concluidoPorId!);
      return {
        membroId: item.concluidoPorId,
        nome: membro?.nome ?? 'Desconhecido',
        fotoPerfil: membro?.fotoPerfil ?? null,
        pontos: item._sum.pontosObtidos ?? 0,
      };
    });
  }

  async urgentes(familiaId: string) {
    const tarefas = await tarefaRepository.findUrgentesByFamilia(familiaId);

    return tarefas.map((tarefa: any) => {
      const hoje = new Date();
      const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const fimDoDia = new Date(inicioDoDia.getTime() + 24 * 60 * 60 * 1000);

      const venceHoje = tarefa.execucoes?.find(
        (e: any) =>
          e.status === 'AGENDADA' &&
          e.data >= inicioDoDia &&
          e.data < fimDoDia,
      );
      const atrasada = tarefa.execucoes?.find((e: any) => e.status === 'ATRASADA');

      return transformResponsavel({
        ...tarefa,
        execucoes: venceHoje ? [venceHoje] : atrasada ? [atrasada] : [],
      });
    });
  }

  async resumo(familiaId: string) {
    const totalTarefas = await tarefaRepository.countByFamilia(familiaId);
    const execucoesConcluidas = await tarefaRepository.countExecucoesByFamiliaAndStatus(
      familiaId,
      StatusExecucao.CONCLUIDA,
    );
    const execucoesAtrasadas = await tarefaRepository.countExecucoesByFamiliaAndStatus(
      familiaId,
      StatusExecucao.ATRASADA,
    );

    const ciclosAtivos = await cicloRepository.findCiclosAtivos(familiaId);
    const agora = new Date();

    const ciclos = ciclosAtivos.map((c) => {
      const referencia = c.proximaRenovacao
        ? new Date(c.proximaRenovacao)
        : new Date(c.inicio.getTime() + c.duracaoDias * 24 * 60 * 60 * 1000);
      const diffMs = referencia.getTime() - agora.getTime();
      const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        id: c.id,
        nome: c.nome,
        inicio: c.inicio,
        duracaoDias: c.duracaoDias,
        diasRestantes,
      };
    });

    return {
      totalTarefas,
      execucoesConcluidas,
      execucoesAtrasadas,
      ciclos,
    };
  }
}

export const tarefaService = new TarefaService();
