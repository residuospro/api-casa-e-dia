import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import familyRoutes from './family.routes';
import notificationRoutes from './notification.routes';
import tarefaRoutes from './tarefa.routes';
import cicloRoutes from './ciclo.routes';

const router: Router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/families', familyRoutes);
router.use('/tarefas', tarefaRoutes);
router.use('/ciclos', cicloRoutes);
router.use('/notifications', notificationRoutes);

export default router;
