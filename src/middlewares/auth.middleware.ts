import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { authRepository } from '../repositories/auth.repository';

export interface AuthRequest extends Request {
  usuario?: {
    id: string;
    nome: string;
    email: string;
    fotoPerfil: string | null;
    genero: string | null;
    primeiroAcesso: boolean;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token não fornecido' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, jwtConfig.secret) as { sub: string; email: string };
    const usuario = await authRepository.findUsuarioById(payload.sub);

    if (!usuario) {
      res.status(401).json({ error: 'Unauthorized', message: 'Usuário não encontrado' });
      return;
    }

    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Token inválido' });
  }
}
