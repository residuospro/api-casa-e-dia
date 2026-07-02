import { Router } from 'express';
import { cicloController } from '../controllers/ciclo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/:familiaId/ciclos', authMiddleware, cicloController.criar);
router.get('/:familiaId/ciclos', authMiddleware, cicloController.listar);
router.get('/:familiaId/ciclos/ativos', authMiddleware, cicloController.listarAtivos);
router.get('/:familiaId/ciclos/verificar', authMiddleware, cicloController.verificarCiclos);
router.get('/:familiaId/ciclos/:id', authMiddleware, cicloController.obter);
router.put('/:familiaId/ciclos/:id', authMiddleware, cicloController.atualizar);
router.delete('/:familiaId/ciclos/:id', authMiddleware, cicloController.remover);
router.post('/:familiaId/ciclos/:id/rotacionar', authMiddleware, cicloController.rotacionar);
router.patch('/:familiaId/ciclos/:id/ativo', authMiddleware, cicloController.alterarAtivo);

export default router;
