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

        if (dto.responsavelAtualId && !cicloRevezamento.participantes.includes(dto.responsavelAtualId)) {
          throw new AppError('Responsável não faz parte do ciclo', 400);
        }

        if (dto.execucoes && dto.execucoes.length > 0) {
          const vencimento = new Date(cicloRevezamento.inicio.getTime() + cicloRevezamento.duracaoDias * 24 * 60 * 60 * 1000);

          for (const execucao of dto.execucoes) {
            if (execucao.data > vencimento) {
              throw new AppError('Execução com data após o vencimento do ciclo', 400);
            }
          }
        }
      }
    }

    const tarefa = await tarefaRepository.create({
      ...dto,
      pontos: dto.pontos ?? 0,
      cicloIteracao: cicloRevezamento?.iteracao,
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

    if (!filtro.cicloId) {
      const cicloAtivo = await cicloRepository.findCicloAtivo(familiaId);
      if (cicloAtivo) {
        filtro.cicloId = [cicloAtivo.id, 'null'];
      } else {
        filtro.cicloId = 'null';
      }
    }

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

  async resumo(familiaId: string) {
    const totalTarefas = await tarefaRepository.countByFamilia(familiaId);
    const tarefasConcluidas = await tarefaRepository.countByFamiliaAndExecucaoStatus(
      familiaId,
      StatusExecucao.CONCLUIDA,
    );
    const tarefasAtrasadas = await tarefaRepository.countByFamiliaAndExecucaoStatus(
      familiaId,
      StatusExecucao.ATRASADA,
    );

    const cicloAtivo = await cicloRepository.findCicloAtivo(familiaId);
    let diasRestantes = null;
    let ciclo = null;

    if (cicloAtivo) {
      const fimCiclo = new Date(cicloAtivo.inicio);
      fimCiclo.setDate(fimCiclo.getDate() + cicloAtivo.duracaoDias);
      const agora = new Date();
      const diffMs = fimCiclo.getTime() - agora.getTime();
      diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      ciclo = {
        id: cicloAtivo.id,
        nome: cicloAtivo.nome,
        inicio: cicloAtivo.inicio,
        duracaoDias: cicloAtivo.duracaoDias,
      };
    }

    return {
      totalTarefas,
      tarefasConcluidas,
      tarefasAtrasadas,
      diasRestantes,
      ciclo,
    };
  }
}

export const tarefaService = new TarefaService();
