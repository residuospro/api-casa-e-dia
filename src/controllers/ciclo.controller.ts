import { Response, NextFunction } from 'express';
import { cicloService } from '../services/ciclo.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { criarCicloSchema, atualizarCicloSchema } from '../validators/ciclo.validator';
import { ZodError } from 'zod';

export const cicloController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dados = criarCicloSchema.parse(req.body);
      const { familiaId } = req.params;

      const resultado = await cicloService.criar({
        ...dados,
        familiaId,
      });

      res.status(201).json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      next(err);
    }
  },

  async listar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await cicloService.listar(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async obter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const resultado = await cicloService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarCicloSchema.parse(req.body);
      const resultado = await cicloService.atualizar(familiaId, id, dados);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      next(err);
    }
  },

  async remover(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const resultado = await cicloService.remover(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async rotacionar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const resultado = await cicloService.rotacionar(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async listarAtivos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await cicloService.listarAtivos(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async alterarAtivo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const { ativo } = req.body;

      if (typeof ativo !== 'boolean') {
        res.status(400).json({ error: 'Bad Request', message: 'ativo deve ser true ou false' });
        return;
      }
      const resultado = await cicloService.alterarAtivo(familiaId, id, ativo);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async verificarCiclos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await cicloService.verificarCiclos(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
};
