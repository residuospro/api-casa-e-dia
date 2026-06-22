import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';

const router: Router = Router();

router.get('/:filename', uploadController.serveImagem);

export default router;
