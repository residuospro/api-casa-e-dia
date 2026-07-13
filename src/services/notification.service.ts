import { notificationRepository } from '../repositories/notification.repository';
import { NotificacaoTipo } from '../models/enums';
import { AppError } from './auth.service';
import { getIO } from '../socket';
import { pushNotificationService } from './push-notification.service';

function formatNotificacao(n: any) {
  let dadosParsed: any = null;
  let remetente: { nome: string; fotoPerfil: string | null } | null = null;

  if (n.dados) {
    try {
      dadosParsed = JSON.parse(n.dados);
      if (dadosParsed.remetenteNome) {
        remetente = {
          nome: dadosParsed.remetenteNome,
          fotoPerfil: dadosParsed.remetenteFotoPerfil || null,
        };
      }
      delete dadosParsed.remetenteNome;
      delete dadosParsed.remetenteFotoPerfil;
    } catch {
      dadosParsed = n.dados;
    }
  }

  return {
    id: n.id,
    usuarioId: n.usuarioId,
    tipo: n.tipo,
    lido: n.lido,
    titulo: n.titulo,
    mensagem: n.mensagem,
    dados: dadosParsed,
    remetente,
    criadoEm: n.criadoEm,
  };
}

export class NotificationService {
  async criar(dto: {
    usuarioId: string;
    tipo: NotificacaoTipo;
    titulo: string;
    mensagem: string;
    dados?: string | null;
  }) {
    const notificacao = await notificationRepository.create(dto);

    const formatada = formatNotificacao(notificacao);

    try {
      const io = getIO();
      io.to(`user:${dto.usuarioId}`).emit('notification:new', formatada);
    } catch {
      // Socket.IO não inicializado (ex: testes)
    }

    this.enviarPush(dto.usuarioId, dto.tipo, formatada).catch(() => {});

    return notificacao;
  }

  async listar(usuarioId: string) {
    const notificacoes = await notificationRepository.findByUsuario(usuarioId);
    return notificacoes.map(formatNotificacao);
  }

  async contarNaoLidas(usuarioId: string) {
    return notificationRepository.findUnreadCount(usuarioId);
  }

  async marcarComoLida(usuarioId: string, notificacaoId: string) {
    const notificacao = await notificationRepository.findById(notificacaoId);
    if (!notificacao) {
      throw new AppError('Notificação não encontrada', 404);
    }
    if (notificacao.usuarioId !== usuarioId) {
      throw new AppError('Notificação não pertence a você', 403);
    }
    return notificationRepository.markAsRead(notificacaoId);
  }

  async marcarTodasComoLidas(usuarioId: string) {
    await notificationRepository.markAllAsRead(usuarioId);
    return { message: 'Todas as notificações foram marcadas como lidas' };
  }

  async excluir(usuarioId: string, notificacaoId: string) {
    const notificacao = await notificationRepository.findById(notificacaoId);
    if (!notificacao) {
      throw new AppError('Notificação não encontrada', 404);
    }
    if (notificacao.usuarioId !== usuarioId) {
      throw new AppError('Notificação não pertence a você', 403);
    }
    await notificationRepository.delete(notificacaoId);
    return { message: 'Notificação excluída com sucesso' };
  }

  async excluirTodas(usuarioId: string) {
    await notificationRepository.deleteAllByUsuario(usuarioId);
    return { message: 'Todas as notificações foram excluídas' };
  }

  private async enviarPush(usuarioId: string, tipo: NotificacaoTipo, notificacao: any) {
    let url = '/';

    if (notificacao.dados) {
      if (notificacao.dados.tarefaId) {
        url = `/tarefas/${notificacao.dados.tarefaId}`;
      } else if (notificacao.dados.cicloId) {
        url = `/ciclos/${notificacao.dados.cicloId}`;
      } else if (notificacao.dados.familiaId) {
        url = `/familia/${notificacao.dados.familiaId}`;
      }
    }

    await pushNotificationService.sendToUser(usuarioId, {
      titulo: notificacao.titulo,
      mensagem: notificacao.mensagem,
      url,
      id: notificacao.id,
    });
  }
}

export const notificationService = new NotificationService();
