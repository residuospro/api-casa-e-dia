import prisma from '../config/database';
import { UsuarioCriar } from '../models/usuario.model';
import { MembroFamiliaCriar } from '../models/membro-familia.model';
import { FamiliaCriar } from '../models/familia.model';

export const authRepository = {
  findUsuarioByEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  findUsuarioById(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, celular: true, fotoPerfil: true, genero: true, primeiroAcesso: true },
    });
  },

  createUsuario(data: UsuarioCriar) {
    return prisma.usuario.create({ data });
  },

  createFamilia(data: FamiliaCriar) {
    return prisma.familia.create({ data });
  },

  createMembroFamilia(data: MembroFamiliaCriar) {
    return prisma.membroFamilia.create({ data });
  },

  transaction<T>(fn: (tx: typeof prisma) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  },

  findUserFamilyProfile(usuarioId: string) {
    return prisma.membroFamilia.findFirst({
      where: { usuarioId },
      include: {
        usuario: {
          select: { nome: true, fotoPerfil: true, genero: true },
        },
        familia: {
          include: {
            _count: { select: { membros: true } },
          },
        },
      },
      orderBy: { criadoEm: 'asc' },
    });
  },
};
