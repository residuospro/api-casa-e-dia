import prisma from '../config/database';

export const pushSubscriptionRepository = {
  create(data: {
    usuarioId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { p256dh: data.p256dh, auth: data.auth, userAgent: data.userAgent },
      create: data,
    });
  },

  findByUsuario(usuarioId: string) {
    return prisma.pushSubscription.findMany({ where: { usuarioId } });
  },

  findById(id: string) {
    return prisma.pushSubscription.findUnique({ where: { id } });
  },

  delete(id: string) {
    return prisma.pushSubscription.delete({ where: { id } });
  },

  deleteByEndpoint(endpoint: string) {
    return prisma.pushSubscription.deleteMany({ where: { endpoint } });
  },

  findAll() {
    return prisma.pushSubscription.findMany();
  },
};
