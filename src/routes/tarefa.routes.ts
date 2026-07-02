import { Router } from 'express';
import { tarefaController } from '../controllers/tarefa.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/:familiaId/tarefas', authMiddleware, tarefaController.criar);
router.get('/:familiaId/tarefas', authMiddleware, tarefaController.listar);
router.get('/:familiaId/tarefas/:id', authMiddleware, tarefaController.obter);
router.put('/:familiaId/tarefas/:id', authMiddleware, tarefaController.atualizar);
router.delete('/:familiaId/tarefas/:id', authMiddleware, tarefaController.remover);
router.post('/:familiaId/tarefas/:id/concluir', authMiddleware, tarefaController.concluir);
router.get('/:familiaId/ranking', authMiddleware, tarefaController.ranking);

export default router;
