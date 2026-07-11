import { cicloRepository } from '../repositories/ciclo.repository';
import { tarefaRepository } from '../repositories/tarefa.repository';
import { familyRepository } from '../repositories/family.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { notificationService } from './notification.service';
import { AppError } from './auth.service';
import { CriarCicloDTO, AtualizarCicloDTO } from '../models/ciclo.model';
import { NotificacaoTipo } from '../models/enums';
import { renovarExecucoesTarefa } from './tarefa.service';

export class CicloService {
  private estaExpirado(ciclo: {
    inicio: Date;
    duracaoDias: number;
    proximaRenovacao: Date | null;
  }): boolean {
    const agora = new Date();
    if (ciclo.proximaRenovacao) {
      return ciclo.proximaRenovacao <= agora;
    }
    const fim = new Date(ciclo.inicio);
    fim.setDate(fim.getDate() + ciclo.duracaoDias);
    return fim <= agora;
  }

  async criar(dto: CriarCicloDTO) {
    const familia = await familyRepository.findFamiliaById(dto.familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    return cicloRepository.create({
      ...dto,
      ativo: dto.ativo ?? true,
    });
  }

  async listar(familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const ciclos = await cicloRepository.findByFamilia(familiaId);

    for (const ciclo of ciclos) {
      const expirado = this.estaExpirado(ciclo);
      if (expirado && !ciclo.expirado) {
        await cicloRepository.update(ciclo.id, { expirado: true });
        ciclo.expirado = true;
      }
    }

    return ciclos;
  }

  async obter(familiaId: string, cicloId: string) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    const expirado = this.estaExpirado(ciclo);
    if (expirado && !ciclo.expirado) {
      await cicloRepository.update(ciclo.id, { expirado: true });
      ciclo.expirado = true;
    }

    return ciclo;
  }

  async atualizar(familiaId: string, cicloId: string, dto: AtualizarCicloDTO) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
    }

    const { inicio, ...rest } = dto;
    if (inicio) {
      const dataInicio = new Date(inicio);
      if (dataInicio < new Date()) {
        throw new AppError('Data de início não pode ser no passado', 400);
      }
      return cicloRepository.update(cicloId, { ...rest, inicio: dataInicio });
    }
    return cicloRepository.update(cicloId, rest);
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
    const vencimento = ciclo.proximaRenovacao
      ? new Date(ciclo.proximaRenovacao)
      : new Date(ciclo.inicio.getTime() + ciclo.duracaoDias * 24 * 60 * 60 * 1000);

    if (agora < vencimento) {
      const diasRestantes = Math.ceil(
        (vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
      );
      throw new AppError(`Ciclo ainda não venceu. Faltam ${diasRestantes} dia(s)`, 400);
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

    membros = membros.sort((a, b) => a.localeCompare(b));

    const tarefasAtualizadas = tarefas.map((tarefa, indice) => {
      const membroId = membros[(indice + proximaIteracao) % membros.length];
      return tarefaRepository.updateResponsavel(tarefa.id, membroId, proximaIteracao);
    });

    const tarefasResultado = await Promise.all(tarefasAtualizadas);

    await cicloRepository.update(cicloId, {
      renovadoEm: agora,
      proximaRenovacao: new Date(agora.getTime() + ciclo.duracaoDias * 24 * 60 * 60 * 1000),
      iteracao: proximaIteracao,
      expirado: false,
    });

    for (const tarefa of tarefas) {
      await renovarExecucoesTarefa(tarefa.id, proximaIteracao, agora, ciclo.duracaoDias);
    }

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

    for (const ciclo of ciclos) {
      const expirado = this.estaExpirado(ciclo);
      if (expirado && !ciclo.expirado) {
        await cicloRepository.update(ciclo.id, { expirado: true });
        ciclo.expirado = true;
      }
    }

    return ciclos.map((c) => ({ text: c.nome, value: c.id }));
  }

  async alterarAtivo(familiaId: string, cicloId: string, ativo: boolean) {
    const ciclo = await cicloRepository.findById(cicloId);
    if (!ciclo || ciclo.familiaId !== familiaId) {
      throw new AppError('Ciclo não encontrado', 404);
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
        proximaRenovacao: c.proximaRenovacao,
      })),
    };
  }
}

export const cicloService = new CicloService();
