import { authRepository } from '../repositories/auth.repository';
import { AppError } from './auth.service';
import { generateAvatar } from '../utils/avatar';

export class UserService {
  async getProfile(usuarioId: string) {
    const usuario = await authRepository.findUsuarioById(usuarioId);
    if (!usuario) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const membro = await authRepository.findUserFamilyProfile(usuarioId);

    const perfil: any = {
      id: membro?.id ?? usuario.id,
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      celular: usuario.celular ?? null,
      genero: usuario.genero,
      fotoPerfil: usuario.fotoPerfil ?? generateAvatar(usuario.nome, usuario.genero),
      familiaId: membro?.familiaId ?? null,
    };

    if (membro?.usuario && membro.familia) {
      perfil.permissao = membro.permissao;
      perfil.familia = membro.familia.nome;
      perfil.totalMembros = membro.familia._count.membros;
    }

    return perfil;
  }
}

export const userService = new UserService();
