import { Router } from 'express';
import { familyController } from '../controllers/family.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router: Router = Router();

router.post('/', authMiddleware, familyController.criarFamilia);
router.get('/', authMiddleware, familyController.listarFamilias);
router.get('/obterFamilia', authMiddleware, familyController.obterFamilia);
router.put('/:familiaId', authMiddleware, familyController.atualizarFamilia);
router.delete('/:familiaId', authMiddleware, familyController.removerFamilia);

router.get('/convites', authMiddleware, familyController.listarConvitesPendentes);
router.post('/convites/:membroId/responder', authMiddleware, familyController.responderConvite);

router.post(
  '/:familiaId/membros/dependentes',
  authMiddleware,
  upload.single('fotoPerfil'),
  familyController.cadastrarDependente,
);
router.post('/:familiaId/membros', authMiddleware, familyController.convidarMembro);
router.get('/:familiaId/membros', authMiddleware, familyController.listarMembros);
router.get('/:familiaId/membros/buscar', authMiddleware, familyController.buscarMembros);
router.get('/:familiaId/membros/:membroId', authMiddleware, familyController.obterMembro);
router.put(
  '/:familiaId/membros/:membroId',
  authMiddleware,
  upload.single('fotoPerfil'),
  familyController.atualizarMembro,
);
router.delete('/:familiaId/membros/:membroId', authMiddleware, familyController.removerMembro);
router.post(
  '/:familiaId/membros/:membroId/re-enviar-convite',
  authMiddleware,
  familyController.reEnviarConvite,
);

export default router;
