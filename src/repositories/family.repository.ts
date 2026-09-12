import prisma from '../config/database';

export const familyRepository = {
  findFamiliaById(id: string) {
    return prisma.familia.findUnique({
      where: { id },
      include: { _count: { select: { membros: true } } },
    });
  },

  findFamiliasByUsuario(usuarioId: string) {
    return prisma.familia.findMany({
      where: { membros: { some: { usuarioId } } },
      include: { _count: { select: { membros: true } } },
      orderBy: { criadoEm: 'asc' },
    });
  },

  createFamilia(data: { nome: string }) {
    return prisma.familia.create({ data });
  },

  updateFamilia(id: string, nome: string) {
    return prisma.familia.update({
      where: { id },
      data: { nome },
      include: { _count: { select: { membros: true } } },
    });
  },

  deleteFamilia(id: string) {
    return prisma.familia.delete({ where: { id } });
  },

  findMembrosByFamilia(familiaId: string) {
    return prisma.membroFamilia.findMany({
      where: { familiaId },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, fotoPerfil: true, genero: true },
        },
      },
      orderBy: { criadoEm: 'asc' },
    });
  },

  findMembrosAtivosByFamilia(familiaId: string) {
    return prisma.membroFamilia.findMany({
      where: { familiaId, status: 'ACEITO' },
      select: { id: true, usuarioId: true, nome: true },
    });
  },

  findMembrosByIds(ids: string[]) {
    return prisma.membroFamilia.findMany({
      where: { id: { in: ids } },
      select: { id: true, usuarioId: true, nome: true },
    });
  },

  searchMembros(familiaId: string, query: string) {
    return prisma.membroFamilia.findMany({
      where: {
        familiaId,
        OR: [
          { nome: { contains: query, mode: 'insensitive' } },
          { usuario: { nome: { contains: query, mode: 'insensitive' } } },
          { usuario: { email: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, fotoPerfil: true, genero: true },
        },
      },
      orderBy: { criadoEm: 'asc' },
    });
  },

  findMembroById(id: string) {
    return prisma.membroFamilia.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            fotoPerfil: true,
            genero: true,
            tokenPrimeiroAcesso: true,
            tokenExpiraEm: true,
          },
        },
      },
    });
  },

  createUsuarioConvidado(data: {
    nome: string;
    email: string;
    senha: string;
    genero: string;
    tokenPrimeiroAcesso: string;
    tokenExpiraEm: Date;
  }) {
    return prisma.usuario.create({ data: data as any });
  },

  findMembroByUsuarioAndFamilia(usuarioId: string, familiaId: string) {
    return prisma.membroFamilia.findFirst({
      where: { usuarioId, familiaId },
    });
  },

  findMembrosAceitosByUsuario(usuarioId: string) {
    return prisma.membroFamilia.findMany({
      where: { usuarioId, status: 'ACEITO' },
      select: { id: true, permissao: true },
    });
  },

  findConvitesPendentes(usuarioId: string) {
    return prisma.membroFamilia.findMany({
      where: { usuarioId, status: 'PENDENTE' },
      include: {
        familia: { select: { id: true, nome: true } },
        usuario: {
          select: { id: true, nome: true, email: true, fotoPerfil: true, genero: true },
        },
      },
      orderBy: { criadoEm: 'asc' },
    });
  },

  updateMembroStatus(id: string, status: string) {
    return prisma.membroFamilia.update({
      where: { id },
      data: { status: status as any },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, fotoPerfil: true, genero: true },
        },
      },
    });
  },

  createMembroFamilia(data: {
    usuarioId?: string | null;
    familiaId: string;
    nome?: string | null;
    fotoPerfil?: string | null;
    genero?: string | null;
    tipoPessoa: string;
    permissao?: string | null;
    dependente?: boolean;
    conviteEnviado?: boolean;
    status?: string;
  }) {
    return prisma.membroFamilia.create({ data: data as any });
  },

  updateMembro(
    id: string,
    data: {
      nome?: string;
      fotoPerfil?: string | null;
      genero?: string | null;
      tipoPessoa?: string;
      permissao?: string | null;
    },
  ) {
    return prisma.membroFamilia.update({
      where: { id },
      data: data as any,
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, fotoPerfil: true, genero: true },
        },
      },
    });
  },

  deleteMembro(id: string) {
    return prisma.membroFamilia.delete({ where: { id } });
  },

  updateConviteEnviado(id: string) {
    return prisma.membroFamilia.update({
      where: { id },
      data: { conviteEnviado: true },
    });
  },

  updateTokenPrimeiroAcesso(usuarioId: string, token: string, expiraEm: Date) {
    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        tokenPrimeiroAcesso: token,
        tokenExpiraEm: expiraEm,
      },
    });
  },

  findUsuarioByToken(token: string) {
    return prisma.usuario.findFirst({
      where: { tokenPrimeiroAcesso: token },
    });
  },

  updateSenhaAndPrimeiroAcesso(usuarioId: string, senhaHash: string) {
    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senha: senhaHash,
        primeiroAcesso: false,
        tokenPrimeiroAcesso: null,
        tokenExpiraEm: null,
      },
    });
  },

  transaction<T>(fn: (tx: typeof prisma) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  },
};
