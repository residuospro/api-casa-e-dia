import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { pushNotificationService } from '../services/push-notification.service';
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

  async pushSubscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { subscription, userAgent } = req.body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        res.status(400).json({ error: 'Bad Request', message: 'Assinatura push inválida' });
        return;
      }
      const resultado = await pushNotificationService.subscribe(
        req.usuario!.id,
        subscription,
        userAgent,
      );
      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  },
};
