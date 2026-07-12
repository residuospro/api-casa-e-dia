import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export const notificationController = {
  async listar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await notificationService.listar(req.usuario!.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async contarNaoLidas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.contarNaoLidas(req.usuario!.id);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },

  async marcarComoLida(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const resultado = await notificationService.marcarComoLida(req.usuario!.id, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async marcarTodasComoLidas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await notificationService.marcarTodasComoLidas(req.usuario!.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async excluir(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const resultado = await notificationService.excluir(req.usuario!.id, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async excluirTodas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await notificationService.excluirTodas(req.usuario!.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
};
