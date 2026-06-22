import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { userController } from '../controllers/user.controller';

const router: Router = Router();

router.get('/me', authMiddleware, (req: any, res) => {
  res.json(req.usuario);
});

router.get('/me/perfil', authMiddleware, userController.perfil);

export default router;
