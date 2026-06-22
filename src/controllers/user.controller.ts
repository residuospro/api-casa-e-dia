import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export const userController = {
  async perfil(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.usuario!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
};
