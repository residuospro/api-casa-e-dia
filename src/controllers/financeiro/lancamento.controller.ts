import { Response, NextFunction } from 'express';
import { lancamentoService } from '../../services/financeiro/lancamento.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  criarLancamentoSchema,
  atualizarLancamentoSchema,
  alterarStatusLancamentoSchema,
  filtrosLancamentoQuerySchema,
  periodoQuerySchema,
  agrupamentoPeriodoQuerySchema,
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

export const lancamentoController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = criarLancamentoSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await lancamentoService.criar(familiaId, membro.id, req.usuario!.id, dados);
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
      const filtros = filtrosLancamentoQuerySchema.parse(query);

      const resultado = await lancamentoService.listar(familiaId, filtros, options, params);
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

      const resultado = await lancamentoService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarLancamentoSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await lancamentoService.atualizar(familiaId, req.usuario!.id, id, dados);
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async alterarStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = alterarStatusLancamentoSchema.parse(req.body);

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const resultado = await lancamentoService.alterarStatus(familiaId, req.usuario!.id, id, dados);
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

      await lancamentoService.remover(familiaId, req.usuario!.id, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async resumo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { inicio, fim } = periodoQuerySchema.parse(req.query);
      const resultado = await lancamentoService.resumo(familiaId, new Date(inicio), new Date(fim));
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async agruparPorCategoria(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { inicio, fim } = periodoQuerySchema.parse(req.query);
      const resultado = await lancamentoService.agruparPorCategoria(familiaId, new Date(inicio), new Date(fim));
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async agruparPorConta(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { inicio, fim } = periodoQuerySchema.parse(req.query);
      const resultado = await lancamentoService.agruparPorConta(familiaId, new Date(inicio), new Date(fim));
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async agruparPorFormaPagamento(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { inicio, fim } = periodoQuerySchema.parse(req.query);
      const resultado = await lancamentoService.agruparPorFormaPagamento(familiaId, new Date(inicio), new Date(fim));
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async agruparPorPeriodo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const { inicio, fim, granularidade } = agrupamentoPeriodoQuerySchema.parse(req.query);
      const resultado = await lancamentoService.agruparPorPeriodo(
        familiaId,
        new Date(inicio),
        new Date(fim),
        granularidade,
      );
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },
};
