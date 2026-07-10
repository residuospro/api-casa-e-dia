import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { userController } from '../controllers/user.controller';

const router: Router = Router();

router.get('/me', authMiddleware, (req: any, res) => {
  res.json(req.usuario);
});

router.get('/me/perfil', authMiddleware, userController.perfil);
router.put('/me/perfil', authMiddleware, upload.single('fotoPerfil'), userController.atualizarPerfil);

export default router;
