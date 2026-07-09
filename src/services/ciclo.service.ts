import { cicloRepository } from '../repositories/ciclo.repository';
import { tarefaRepository } from '../repositories/tarefa.repository';
import { familyRepository } from '../repositories/family.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { notificationService } from './notification.service';
import { AppError } from './auth.service';
import { CriarCicloDTO, AtualizarCicloDTO } from '../models/ciclo.model';
import { NotificacaoTipo } from '../models/enums';

export class CicloService {
  async criar(dto: CriarCicloDTO) {
    const familia = await familyRepository.findFamiliaById(dto.familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const jaExisteAtivo = await cicloRepository.findCicloAtivo(dto.familiaId);

    return cicloRepository.create({
      ...dto,
      ativo: jaExisteAtivo ? false : (dto.ativo ?? true),
    });
  }

  async listar(familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    return cicloRepository.findByFamilia(familiaId);
  }

  async obter(familiaId: string, cicloId: string) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    return ciclo;
  }

  async atualizar(familiaId: string, cicloId: string, dto: AtualizarCicloDTO) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    if (dto.ativo === true) {
      const outroAtivo = await cicloRepository.findCicloAtivo(familiaId);
      if (outroAtivo && outroAtivo.id !== cicloId) {
        throw new AppError('Já existe um ciclo ativo nesta família. Desative-o primeiro.', 400);
      }
    }

    const { inicio, ...rest } = dto;
    return cicloRepository.update(cicloId, {
      ...rest,
      ...(inicio ? { inicio: new Date(inicio) } : {}),
    });
  }

  async remover(familiaId: string, cicloId: string) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    await cicloRepository.delete(cicloId);
    return { message: 'Ciclo removido com sucesso' };
  }

  async rotacionar(familiaId: string, cicloId: string) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    if (!ciclo.ativo) {
      throw new AppError('Ciclo inativo não pode ser rotacionado', 400);
    }

    const agora = new Date();
    const diasDesdeInicio = Math.floor(
      (agora.getTime() - ciclo.inicio.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasDesdeInicio < ciclo.duracaoDias) {
      throw new AppError(
        `Ciclo ainda não venceu. Faltam ${ciclo.duracaoDias - diasDesdeInicio} dia(s)`,
        400,
      );
    }

    const tarefas = await tarefaRepository.findRevezamentoByCiclo(cicloId);
    if (tarefas.length === 0) {
      throw new AppError('Nenhuma tarefa de revezamento encontrada neste ciclo', 400);
    }

    let membros = ciclo.participantes;

    if (membros.length === 0) {
      const membrosAtivos = await familyRepository.findMembrosAtivosByFamilia(familiaId);
      membros = membrosAtivos.map((m) => m.id);
    }

    if (membros.length === 0) {
      throw new AppError('Nenhum membro disponível para redistribuir tarefas', 400);
    }

    const proximaIteracao = ciclo.iteracao + 1;

    membros.sort((a, b) => a.localeCompare(b));

    const tarefasAtualizadas = tarefas.map((tarefa, indice) => {
      const membroId = membros[indice % membros.length];
      return tarefaRepository.updateResponsavel(tarefa.id, membroId, proximaIteracao);
    });

    const tarefasResultado = await Promise.all(tarefasAtualizadas);

    await cicloRepository.update(cicloId, {
      inicio: agora,
      ultimaRotacao: agora,
      iteracao: proximaIteracao,
    });

    const cicloAtualizado = await cicloRepository.findById(cicloId);

    return {
      message: 'Tarefas rotacionadas com sucesso',
      ciclo: cicloAtualizado,
      tarefas: tarefasResultado.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        responsavelAtualId: t.responsavelAtualId,
      })),
    };
  }

  async listarAtivos(familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const ciclos = await cicloRepository.findCiclosAtivos(familiaId);
    return ciclos.map((c) => ({ text: c.nome, value: c.id }));
  }

  async alterarAtivo(familiaId: string, cicloId: string, ativo: boolean) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    if (ativo === true) {
      const outroAtivo = await cicloRepository.findCicloAtivo(familiaId);
      if (outroAtivo && outroAtivo.id !== cicloId) {
        throw new AppError('Já existe um ciclo ativo nesta família. Desative-o primeiro.', 400);
      }
    }

    return cicloRepository.update(cicloId, { ativo });
  }

  private async getUsuariosParaNotificar(ciclo: { familiaId: string; participantes: string[] }) {
    if (ciclo.participantes.length > 0) {
      const membros = await familyRepository.findMembrosByIds(ciclo.participantes);
      return membros.filter((m) => m.usuarioId).map((m) => m.usuarioId!);
    }

    const membros = await familyRepository.findMembrosAtivosByFamilia(ciclo.familiaId);
    return membros.filter((m) => m.usuarioId).map((m) => m.usuarioId!);
  }

  async verificarCiclos(familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const ciclosVencidos = await cicloRepository.findCiclosVencidos(familiaId);

    for (const ciclo of ciclosVencidos) {
      const usuarios = await this.getUsuariosParaNotificar(ciclo);

      for (const usuarioId of usuarios) {
        const notificacaoExistente = await notificationRepository.findCicloNotificationExists(
          usuarioId,
          ciclo.id,
        );

        if (!notificacaoExistente) {
          await notificationService.criar({
            usuarioId,
            tipo: NotificacaoTipo.CICLO_VENCIDO,
            titulo: 'Ciclo venceu',
            mensagem: `O ciclo "${ciclo.nome}" venceu. Rotacione as tarefas para redistribuí-las.`,
            dados: JSON.stringify({ cicloId: ciclo.id }),
          });
        }
      }
    }

    return {
      ciclosVencidos: ciclosVencidos.map((c) => ({
        id: c.id,
        nome: c.nome,
        duracaoDias: c.duracaoDias,
        inicio: c.inicio,
        ultimaRotacao: c.ultimaRotacao,
      })),
    };
  }
}

export const cicloService = new CicloService();
