import prisma from '../config/database';

export const dispositivoPushRepository = {
  create(data: { usuarioId: string; token: string; plataforma?: string }) {
    return prisma.dispositivoPush.upsert({
      where: { token: data.token },
      update: { usuarioId: data.usuarioId, plataforma: data.plataforma ?? 'fcm' },
      create: { ...data, plataforma: data.plataforma ?? 'fcm' },
    });
  },

  findByUsuario(usuarioId: string) {
    return prisma.dispositivoPush.findMany({ where: { usuarioId } });
  },

  findById(id: string) {
    return prisma.dispositivoPush.findUnique({ where: { id } });
  },

  findByToken(token: string) {
    return prisma.dispositivoPush.findUnique({ where: { token } });
  },

  delete(id: string) {
    return prisma.dispositivoPush.delete({ where: { id } });
  },

  deleteByToken(token: string) {
    return prisma.dispositivoPush.deleteMany({ where: { token } });
  },

  deleteAllByUsuario(usuarioId: string) {
    return prisma.dispositivoPush.deleteMany({ where: { usuarioId } });
  },

  findAll() {
    return prisma.dispositivoPush.findMany();
  },
};
