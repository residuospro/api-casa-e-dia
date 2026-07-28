import { Response, NextFunction } from 'express';
import { categoriaFinanceiraService } from '../../services/financeiro/categoria-financeira.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { criarCategoriaSchema, atualizarCategoriaSchema } from '../../validators/financeiro.validator';
import { ZodError } from 'zod';
import { parseListagemQuery } from '../../helpers/listagem.helper';

export const categoriaFinanceiraController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = criarCategoriaSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await categoriaFinanceiraService.criar(familiaId, dados);
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
      const incluirArquivadas = (query.incluirArquivadas as string) === 'true';

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { options, params } = parseListagemQuery(query);
      const filtro = query.filtro as Record<string, string | string[]> | undefined;
      const ordenacao = query.ordenacao as { coluna: string; direcao: 'asc' | 'desc' }[] | undefined;

      const resultado = await categoriaFinanceiraService.listar(familiaId, options, params, filtro, ordenacao, incluirArquivadas);
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

      const resultado = await categoriaFinanceiraService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarCategoriaSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await categoriaFinanceiraService.atualizar(familiaId, id, dados);
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

      await categoriaFinanceiraService.remover(familiaId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
