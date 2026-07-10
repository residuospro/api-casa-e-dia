import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { upload } from '../middlewares/upload.middleware';

const router: Router = Router();

router.post('/cadastrar', upload.single('fotoPerfil'), authController.cadastrar);
router.post('/login', authController.login);
router.post('/primeiro-acesso', authController.primeiroAcesso);

export default router;
