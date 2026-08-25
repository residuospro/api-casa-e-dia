import { Response, NextFunction } from 'express';
import { subcategoriaService } from '../../services/financeiro/subcategoria.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { criarSubcategoriaSchema, atualizarSubcategoriaSchema } from '../../validators/financeiro.validator';
import { ZodError } from 'zod';
import { parseListagemQuery } from '../../helpers/listagem.helper';

export const subcategoriaController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = criarSubcategoriaSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await subcategoriaService.criar(familiaId, dados);
      res.status(201).json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Bad Request', message: err.errors.map((e) => e.message) });
        return;
      }
      next(err);
    }
  },

  async listar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const query = req.query as Record<string, unknown>;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { options, params } = parseListagemQuery(query);
      const filtro = query.filtro as Record<string, string | string[]> | undefined;
      const ordenacao = query.ordenacao as { coluna: string; direcao: 'asc' | 'desc' }[] | undefined;

      const resultado = await subcategoriaService.listar(familiaId, options, params, filtro, ordenacao);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async listarPorCategoria(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, categoriaId } = req.params;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const query = req.query as Record<string, unknown>;
      const { options, params } = parseListagemQuery(query);
      const filtro = query.filtro as Record<string, string | string[]> | undefined;
      const ordenacao = query.ordenacao as { coluna: string; direcao: 'asc' | 'desc' }[] | undefined;

      const resultado = await subcategoriaService.listarPorCategoria(familiaId, categoriaId, options, params, filtro, ordenacao);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async obter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await subcategoriaService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarSubcategoriaSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await subcategoriaService.atualizar(familiaId, id, dados);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Bad Request', message: err.errors.map((e) => e.message) });
        return;
      }
      next(err);
    }
  },

  async remover(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      await subcategoriaService.remover(familiaId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
