import { Router } from 'express';
import { schedulerController } from '../controllers/scheduler.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router: Router = Router();

router.get('/', authMiddleware, adminMiddleware, schedulerController.listar);
router.get(
  '/:identificador/historico',
  authMiddleware,
  adminMiddleware,
  schedulerController.historico,
);
router.post(
  '/:identificador/executar',
  authMiddleware,
  adminMiddleware,
  schedulerController.executar,
);

export default router;
