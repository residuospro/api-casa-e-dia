import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

router.get('/', authMiddleware, notificationController.listar);
router.get('/unread-count', authMiddleware, notificationController.contarNaoLidas);
router.patch('/:id/read', authMiddleware, notificationController.marcarComoLida);
router.patch('/read-all', authMiddleware, notificationController.marcarTodasComoLidas);
router.delete('/all', authMiddleware, notificationController.excluirTodas);
router.delete('/:id', authMiddleware, notificationController.excluir);
router.post('/push-subscribe', authMiddleware, notificationController.pushSubscribe);
router.post('/push-unsubscribe', authMiddleware, notificationController.pushUnsubscribe);

export default router;
