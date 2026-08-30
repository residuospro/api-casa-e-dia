import { Response, NextFunction } from 'express';
import { recorrenciaFinanceiraService } from '../../services/financeiro/recorrencia-financeira.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  criarRecorrenciaSchema,
  atualizarRecorrenciaSchema,
  alterarStatusRecorrenciaSchema,
  filtrosRecorrenciaQuerySchema,
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

export const recorrenciaFinanceiraController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = criarRecorrenciaSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await recorrenciaFinanceiraService.criar(familiaId, dados);
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
      const filtros = filtrosRecorrenciaQuerySchema.parse(query);

      const resultado = await recorrenciaFinanceiraService.listar(
        familiaId,
        filtros,
        options,
        params,
      );
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

      const resultado = await recorrenciaFinanceiraService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarRecorrenciaSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await recorrenciaFinanceiraService.atualizar(familiaId, id, dados);
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async alterarStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = alterarStatusRecorrenciaSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await recorrenciaFinanceiraService.alterarStatus(
        familiaId,
        id,
        dados.ativa,
      );
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
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

      await recorrenciaFinanceiraService.remover(familiaId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async executarManual(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await recorrenciaFinanceiraService.executarManual(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async listarOcorrencias(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const query = req.query as Record<string, unknown>;
      const { options, params } = parseListagemQuery(query);

      const resultado = await recorrenciaFinanceiraService.listarOcorrencias(
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
