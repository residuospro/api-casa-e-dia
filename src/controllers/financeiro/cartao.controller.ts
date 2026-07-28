import { Response, NextFunction } from 'express';
import { cartaoService } from '../../services/financeiro/cartao.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { criarCartaoSchema, atualizarCartaoSchema } from '../../validators/financeiro.validator';
import { ZodError } from 'zod';
import { parseListagemQuery } from '../../helpers/listagem.helper';

export const cartaoController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = criarCartaoSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await cartaoService.criar(familiaId, dados);
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

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const query = req.query as Record<string, unknown>;
      const { options, params } = parseListagemQuery(query);
      const filtro = query.filtro as Record<string, string | string[]> | undefined;
      const ordenacao = query.ordenacao as { coluna: string; direcao: 'asc' | 'desc' }[] | undefined;

      const resultado = await cartaoService.listar(familiaId, options, params, filtro, ordenacao);
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

      const resultado = await cartaoService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarCartaoSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await cartaoService.atualizar(familiaId, id, dados);
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

      await cartaoService.remover(familiaId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
