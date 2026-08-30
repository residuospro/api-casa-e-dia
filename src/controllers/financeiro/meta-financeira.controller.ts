import { Response, NextFunction } from 'express';
import { metaFinanceiraService } from '../../services/financeiro/meta-financeira.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  criarMetaFinanceiraSchema,
  atualizarMetaFinanceiraSchema,
  movimentacaoMetaFinanceiraSchema,
  filtrosMetaFinanceiraQuerySchema,
} from '../../validators/financeiro.validator';
import { ZodError } from 'zod';
import { parseListagemQuery } from '../../helpers/listagem.helper';

async function obterMembroOuProibir(req: AuthRequest, familiaId: string) {
  const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
  if (!membro) {
    return null;
  }
  return membro;
}

function responderZodError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Bad Request', message: err.errors.map((e) => e.message) });
    return true;
  }
  return false;
}

export const metaFinanceiraController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = criarMetaFinanceiraSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await metaFinanceiraService.criar(familiaId, dados);
      res.status(201).json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async listar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const query = req.query as Record<string, unknown>;
      const { options, params } = parseListagemQuery(query);
      const filtros = filtrosMetaFinanceiraQuerySchema.parse(query);

      const resultado = await metaFinanceiraService.listar(familiaId, filtros, options, params);
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async obter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await metaFinanceiraService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarMetaFinanceiraSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await metaFinanceiraService.atualizar(familiaId, id, dados);
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async cancelar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await metaFinanceiraService.cancelar(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async remover(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      await metaFinanceiraService.remover(familiaId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async concluir(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await metaFinanceiraService.concluir(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async registrarMovimentacao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = movimentacaoMetaFinanceiraSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await metaFinanceiraService.registrarMovimentacao(
        familiaId,
        id,
        req.usuario!.id,
        dados,
      );
      res.status(201).json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async listarMovimentacoes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const query = req.query as Record<string, unknown>;
      const { options, params } = parseListagemQuery(query);

      const resultado = await metaFinanceiraService.listarMovimentacoes(
        familiaId,
        id,
        options,
        params,
      );
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
};