import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { schedulerRegistry } from '../scheduler/registry';
import { schedulerLogRepository } from '../repositories/scheduler-log.repository';

interface UltimaExecucaoNormalizada {
  status: string;
  rodouEm: string;
  duracaoMs: number;
  origem: string;
  detalhes?: unknown;
  erro?: string | null;
}

function normalizarUltimaExecucao(ultima: any): UltimaExecucaoNormalizada | null {
  if (!ultima) return null;

  return {
    status: ultima.status,
    rodouEm: ultima.rodouEm ?? ultima.iniciadoEm,
    duracaoMs: ultima.duracaoMs ?? 0,
    origem: ultima.origem,
    detalhes: ultima.detalhes ?? null,
    erro: ultima.erro ?? null,
  };
}

export const schedulerController = {
  async listar(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schedulers = await Promise.all(
        schedulerRegistry.obterTodos().map(async (s) => {
          const agregado = await schedulerLogRepository.agregar(s.meta.identificador);

          return {
            identificador: s.meta.identificador,
            nome: s.meta.nome,
            descricao: s.meta.descricao,
            cron: s.meta.cron,
            timezone: s.meta.timezone,
            executando: s.executando,
            ultimaExecucao: normalizarUltimaExecucao(s.ultimaExecucao ?? agregado.ultima),
            proximaExecucao: s.proximaExecucao,
            totalExecucoes: agregado.total,
            totalSucessos: agregado.sucessos,
            totalErros: agregado.erros,
          };
        }),
      );

      res.json({ data: schedulers });
    } catch (err) {
      next(err);
    }
  },

  async historico(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { identificador } = req.params;

      if (!schedulerRegistry.obter(identificador)) {
        res.status(404).json({ error: 'Not Found', message: 'Scheduler não encontrado' });
        return;
      }

      const query = req.query as Record<string, unknown>;
      const pagina = Math.max(1, Number(query.pagina ?? query.page) || 1);
      const porPagina = Math.min(
        100,
        Math.max(1, Number(query.por_pagina ?? query.porPagina) || 10),
      );

      const resultado = await schedulerLogRepository.listar(identificador, pagina, porPagina);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async executar(req: AuthRequest, res: Response, _next: NextFunction) {
    try {
      const { identificador } = req.params;

      if (!schedulerRegistry.obter(identificador)) {
        res.status(404).json({ error: 'Not Found', message: 'Scheduler não encontrado' });
        return;
      }

      if (schedulerRegistry.obter(identificador)?.executando) {
        res.status(409).json({
          error: 'Conflict',
          message: 'Scheduler já está em execução',
        });
        return;
      }

      const resultado = await schedulerRegistry.executar(identificador, 'MANUAL');
      res.json({ message: 'Scheduler executado com sucesso', ...resultado });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao executar scheduler';
      res.status(500).json({ error: 'Internal Server Error', message: mensagem });
    }
  },

  async executarRecorrencia(_req: AuthRequest, res: Response, _next: NextFunction) {
    try {
      const resultado = await schedulerRegistry.executar('recorrencia', 'MANUAL');
      res.json({ message: 'Scheduler executado com sucesso', ...resultado });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao executar scheduler';
      res.status(500).json({ error: 'Internal Server Error', message: mensagem });
    }
  },
};
