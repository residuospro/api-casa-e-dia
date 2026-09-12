import { Response, NextFunction } from 'express';
import { familyRepository } from '../repositories/family.repository';
import type { AuthRequest } from './auth.middleware';

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const membros = await familyRepository.findMembrosAceitosByUsuario(req.usuario!.id);

    const ehAdmin = membros.some((m) => m.permissao === 'ADMIN');

    if (!ehAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Acesso restrito a administradores',
      });
      return;
    }

    next();
  } catch {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Falha ao verificar permissões de acesso',
    });
  }
}
