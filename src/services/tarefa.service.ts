import { tarefaRepository } from '../repositories/tarefa.repository';
import { familyRepository } from '../repositories/family.repository';
import { AppError } from './auth.service';
import { TipoTarefa, ModoDistribuicao } from '../models/enums';
import { generateAvatar } from '../utils/avatar';
import {
  CriarTarefaDTO,
  AtualizarTarefaDTO,
} from '../models/tarefa.model';

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

    if (dto.tipo === TipoTarefa.FAMILIAR) {
      if (dto.modoDistribuicao === ModoDistribuicao.FIXA && !dto.responsavelAtualId) {
        throw new AppError('Tarefa fixa deve ter um responsável', 400);
      }
    }

    const tarefa = await tarefaRepository.create({
      ...dto,
      pontos: dto.pontos ?? 0,
    });

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

    const { data, total } = await tarefaRepository.findByFamiliaWithFilters(
      familiaId,
      { filtro: options.filtro, ordenacao: options.ordenacao, pagina: options.pagina, porPagina: options.porPagina },
    );

    const ultimaPagina = Math.ceil(total / options.porPagina);

    return {
      filtro: options.filtro ?? {},
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

  async concluir(familiaId: string, tarefaId: string, membroId: string, observacao?: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    if (!tarefa.ativo) {
      throw new AppError('Tarefa inativa não pode ser concluída', 400);
    }

    let pontosGerados = 0;

    if (tarefa.tipo !== 'PESSOAL') {
      const gamificacao = await tarefaRepository.findGamificacaoAtiva(familiaId);
      if (gamificacao) {
        pontosGerados = tarefa.pontos;
      }
    }

    await tarefaRepository.createExecucao({
      tarefaId,
      membroId,
      dataExecucao: new Date(),
      observacao,
      pontosGerados,
    });

    return {
      message: 'Tarefa concluída com sucesso',
      pontosGerados,
    };
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
      const membro = membroMap.get(item.membroId);
      return {
        membroId: item.membroId,
        nome: membro?.nome ?? 'Desconhecido',
        fotoPerfil: membro?.fotoPerfil ?? null,
        pontos: item._sum.pontosGerados ?? 0,
      };
    });
  }
}

export const tarefaService = new TarefaService();
