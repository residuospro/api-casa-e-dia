import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');

export const uploadController = {
  async serveImagem(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;

      const caminho = path.resolve(uploadDir, filename);

      if (!caminho.startsWith(uploadDir)) {
        res.status(400).json({ error: 'Bad Request', message: 'Caminho inválido' });
        return;
      }

      if (!fs.existsSync(caminho)) {
        res.status(404).json({ error: 'Not Found', message: 'Imagem não encontrada' });
        return;
      }

      res.sendFile(caminho);
    } catch (err) {
      next(err);
    }
  },
};
