import * as bcrypt from 'bcryptjs';
import { authRepository } from '../repositories/auth.repository';
import { familyRepository } from '../repositories/family.repository';
import { jwtConfig } from '../config/jwt';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import { generateAvatar } from '../utils/avatar';

export const cadastrarSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  celular: z.string().optional(),
  genero: z.enum(['MASCULINO', 'FEMININO']),
  fotoPerfil: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

export const primeiroAcessoSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type CadastrarInput = z.infer<typeof cadastrarSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PrimeiroAcessoInput = z.infer<typeof primeiroAcessoSchema>;

export class AuthService {
  async cadastrar(dto: CadastrarInput) {
    const existente = await authRepository.findUsuarioByEmail(dto.email);
    if (existente) {
      throw new AppError('Email já cadastrado', 409);
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const usuario = await authRepository.createUsuario({
      nome: dto.nome,
      email: dto.email,
      senha: senhaHash,
      celular: dto.celular,
      genero: dto.genero as any,
      fotoPerfil: dto.fotoPerfil,
    });

    const accessToken = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn as any },
    );

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        celular: usuario.celular ?? null,
        fotoPerfil: usuario.fotoPerfil ?? generateAvatar(usuario.nome, usuario.genero),
        genero: usuario.genero,
      },
    };
  }

  async primeiroAcesso(dto: PrimeiroAcessoInput) {
    const usuario = await familyRepository.findUsuarioByToken(dto.token);
    if (!usuario) {
      throw new AppError('Token inválido', 400);
    }

    if (usuario.tokenExpiraEm && usuario.tokenExpiraEm < new Date()) {
      throw new AppError('Token expirado', 400);
    }

    if (!usuario.primeiroAcesso) {
      throw new AppError('Senha já foi definida anteriormente', 400);
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    await familyRepository.updateSenhaAndPrimeiroAcesso(usuario.id, senhaHash);

    const accessToken = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn as any },
    );

    const perfil = await authRepository.findUserFamilyProfile(usuario.id);

    return {
      accessToken,
      familiaId: perfil?.familiaId ?? null,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        celular: usuario.celular ?? null,
        fotoPerfil: usuario.fotoPerfil ?? generateAvatar(usuario.nome, usuario.genero),
        genero: usuario.genero,
      },
    };
  }

  async login(dto: LoginInput) {
    const usuario = await authRepository.findUsuarioByEmail(dto.email);
    if (!usuario) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const accessToken = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn as any },
    );

    const perfil = await authRepository.findUserFamilyProfile(usuario.id);

    return {
      accessToken,
      familiaId: perfil?.familiaId ?? null,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        celular: usuario.celular ?? null,
        fotoPerfil: usuario.fotoPerfil ?? generateAvatar(usuario.nome, usuario.genero),
        genero: usuario.genero,
      },
    };
  }
}

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const authService = new AuthService();
