import * as bcrypt from 'bcryptjs';
import { authRepository } from '../repositories/auth.repository';
import { familyRepository } from '../repositories/family.repository';
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
      tipoPessoa: membro?.tipoPessoa ?? null,
    };

    if (membro?.usuario && membro.familia) {
      perfil.permissao = membro.permissao;
      perfil.familia = membro.familia.nome;
      perfil.totalMembros = membro.familia._count.membros;
    }

    return perfil;
  }

  async updateProfile(
    usuarioId: string,
    dto: {
      nome?: string;
      email?: string;
      senha?: string;
      celular?: string;
      genero?: string;
      fotoPerfil?: string;
      tipoPessoa?: string;
      familiaId?: string;
    },
  ) {
    if (dto.email) {
      const existente = await authRepository.findUsuarioByEmail(dto.email);
      if (existente && existente.id !== usuarioId) {
        throw new AppError('Email já cadastrado', 409);
      }
    }

    const usuarioData: Record<string, unknown> = {};
    if (dto.nome !== undefined) usuarioData.nome = dto.nome;
    if (dto.email !== undefined) usuarioData.email = dto.email;
    if (dto.celular !== undefined) usuarioData.celular = dto.celular;
    if (dto.genero !== undefined) usuarioData.genero = dto.genero;
    if (dto.fotoPerfil !== undefined) usuarioData.fotoPerfil = dto.fotoPerfil;
    if (dto.senha) usuarioData.senha = await bcrypt.hash(dto.senha, 10);

    if (Object.keys(usuarioData).length > 0) {
      await authRepository.updateUsuario(usuarioId, usuarioData as any);
    }

    if (dto.tipoPessoa) {
      if (!dto.familiaId) {
        throw new AppError('familiaId é obrigatório para alterar tipoPessoa', 400);
      }
      const membro = await familyRepository.findMembroByUsuarioAndFamilia(usuarioId, dto.familiaId);
      if (!membro) {
        throw new AppError('Membro não encontrado nesta família', 404);
      }
      await familyRepository.updateMembro(membro.id, { tipoPessoa: dto.tipoPessoa });
    }

    return this.getProfile(usuarioId);
  }
}

export const userService = new UserService();
