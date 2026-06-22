import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/auth.service';
import multer from 'multer';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
      message: err.message,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: 'Bad Request', message: err.message });
    return;
  }

  if (err.message?.includes('Apenas imagens')) {
    res.status(400).json({ error: 'Bad Request', message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor' });
}
