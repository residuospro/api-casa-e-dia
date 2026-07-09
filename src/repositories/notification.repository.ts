import prisma from '../config/database';
import { NotificacaoTipo } from '../models/enums';

export const notificationRepository = {
  create(data: {
    usuarioId: string;
    tipo: NotificacaoTipo;
    titulo: string;
    mensagem: string;
    dados?: string | null;
  }) {
    return prisma.notificacao.create({
      data: {
        ...data,
        criadoEm: new Date(),
      } as any,
    });
  },

  findByUsuario(usuarioId: string) {
    return prisma.notificacao.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'desc' },
    });
  },

  findUnreadCount(usuarioId: string) {
    return prisma.notificacao.count({
      where: { usuarioId, lido: false },
    });
  },

  findById(id: string) {
    return prisma.notificacao.findUnique({
      where: { id },
    });
  },

  findCicloNotificationExists(usuarioId: string, cicloId: string) {
    return prisma.notificacao.findFirst({
      where: {
        usuarioId,
        tipo: 'CICLO_VENCIDO',
        dados: { contains: cicloId },
      },
    });
  },

  markAsRead(id: string) {
    return prisma.notificacao.update({
      where: { id },
      data: { lido: true },
    });
  },

  markAllAsRead(usuarioId: string) {
    return prisma.notificacao.updateMany({
      where: { usuarioId, lido: false },
      data: { lido: true },
    });
  },

  delete(id: string) {
    return prisma.notificacao.delete({
      where: { id },
    });
  },
};
