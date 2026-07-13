import { Request, Response, NextFunction } from 'express';
import {
  authService,
  cadastrarSchema,
  loginSchema,
  primeiroAcessoSchema,
  atualizarPerfilSchema,
} from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ZodError } from 'zod';
import multer from 'multer';
import { fileToBase64 } from '../middlewares/upload.middleware';

export const authController = {
  async cadastrar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = cadastrarSchema.parse({
        ...req.body,
        fotoPerfil: req.file ? fileToBase64(req.file) : undefined,
      });
      const resultado = await authService.cadastrar(dto);
      res.status(201).json(resultado);
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

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body);
      const resultado = await authService.login(dto);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      next(err);
    }
  },

  async primeiroAcesso(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = primeiroAcessoSchema.parse(req.body);
      const resultado = await authService.primeiroAcesso(dto);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      next(err);
    }
  },

  async atualizarPerfil(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dados = atualizarPerfilSchema.parse({
        ...req.body,
        fotoPerfil: req.file ? fileToBase64(req.file) : req.body.fotoPerfil || undefined,
      });
      const resultado = await authService.atualizarPerfil(req.usuario!.id, dados);
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
