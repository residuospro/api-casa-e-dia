import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { userService } from '../services/user.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { atualizarPerfilSchema } from '../services/auth.service';

export const userController = {
  async perfil(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.usuario!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  async atualizarPerfil(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dados = atualizarPerfilSchema.parse({
        ...req.body,
        fotoPerfil: req.file ? `/uploads/${req.file.filename}` : req.body.fotoPerfil || undefined,
      });
      const resultado = await userService.updateProfile(req.usuario!.id, dados);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      if (err instanceof Error && err.message.includes('Apenas imagens')) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      next(err);
    }
  },
};
