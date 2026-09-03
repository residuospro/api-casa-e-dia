import { Response, NextFunction } from 'express';
import { dashboardService } from '../../services/financeiro/dashboard.service';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  periodoQuerySchema,
  agrupamentoPeriodoQuerySchema,
  evolucaoPatrimonioQuerySchema,
  mesAnoDashboardQuerySchema,
} from '../../validators/financeiro.validator';
import { ZodError } from 'zod';

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

function proibido(res: Response): void {
  res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
}

export const dashboardController = {
  async fluxoCaixa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const { inicio, fim, granularidade } = agrupamentoPeriodoQuerySchema.parse(req.query);
      const resultado = await dashboardService.fluxoCaixa(
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

  async evolucaoPatrimonio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const { meses } = evolucaoPatrimonioQuerySchema.parse(req.query);
      const resultado = await dashboardService.evolucaoPatrimonio(familiaId, meses);
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async despesasPorCategoria(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const { inicio, fim } = periodoQuerySchema.parse(req.query);
      const resultado = await dashboardService.despesasPorCategoria(
        familiaId,
        new Date(inicio),
        new Date(fim),
      );
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async metasProgresso(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const resultado = await dashboardService.metasProgresso(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async orcamentosResumo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const { mes, ano } = mesAnoDashboardQuerySchema.parse(req.query);
      const resultado = await dashboardService.orcamentosResumo(familiaId, mes, ano);
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },

  async saldoContas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const resultado = await dashboardService.saldoContas(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async gastosPorResponsavel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await obterMembroOuProibir(req, familiaId);
      if (!membro) {
        proibido(res);
        return;
      }

      const { inicio, fim } = periodoQuerySchema.parse(req.query);
      const resultado = await dashboardService.gastosPorResponsavel(
        familiaId,
        new Date(inicio),
        new Date(fim),
      );
      res.json(resultado);
    } catch (err) {
      if (responderZodError(err, res)) return;
      next(err);
    }
  },
};
