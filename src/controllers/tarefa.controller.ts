import { Response, NextFunction } from 'express';
import { tarefaService } from '../services/tarefa.service';
import { familyRepository } from '../repositories/family.repository';
import { AuthRequest } from '../middlewares/auth.middleware';
import { criarTarefaSchema, atualizarTarefaSchema, concluirTarefaSchema, concluirExecucaoSchema, atualizarExecucaoSchema } from '../validators/tarefa.validator';
import { ZodError } from 'zod';

export const tarefaController = {
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dados = criarTarefaSchema.parse(req.body);
      const { familiaId } = req.params;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(
        req.usuario!.id,
        familiaId,
      );
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Você não é membro desta família' });
        return;
      }

      const execucoes = dados.execucoes?.map((e) => ({
        data: new Date(e.data),
        status: e.status,
        pontosObtidos: e.pontosObtidos,
        concluidoPorId: e.concluidoPorId,
        concluidoEm: e.concluidoEm ? new Date(e.concluidoEm) : null,
        notificacaoCriada: e.notificacaoCriada,
        iteracao: e.iteracao,
        executorId: e.executorId ?? null,
      })) ?? null;

      const resultado = await tarefaService.criar({
        titulo: dados.titulo,
        descricao: dados.descricao,
        tipo: dados.tipo,
        categoria: dados.categoria,
        modoDistribuicao: dados.modoDistribuicao,
        responsavelAtualId: dados.responsavelAtualId,
        participantesId: dados.participantesId,
        atribuirAutomaticamente: dados.atribuirAutomaticamente,
        pontos: dados.pontos,
        cicloId: dados.cicloId,
        familiaId,
        criadoPorId: membro.id,
        recorrencia: dados.recorrencia ?? undefined,
        execucoes,
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

      const query = req.query as Record<string, unknown>;
      const paginacao = query.paginacao as Record<string, string> | undefined;

      const rawPagina = paginacao?.pagina ?? query.pagina ?? query.page;
      const rawPorPagina = paginacao?.por_pagina ?? query.por_pagina ?? query.porPagina;
      const filtro = query.filtro as Record<string, string | string[]> | undefined;
      const ordenacao = query.ordenacao as { coluna: string; direcao: 'asc' | 'desc' }[] | undefined;

      const pagina = Math.max(1, Number(rawPagina) || 1);
      const porPagina = Math.min(100, Math.max(1, Number(rawPorPagina) || 10));

      const resultado = await tarefaService.listar(familiaId, {
        filtro,
        ordenacao: Array.isArray(ordenacao) ? ordenacao : undefined,
        pagina,
        porPagina,
        paginaResposta: Number(rawPagina) || 1,
        porPaginaResposta: Number(rawPorPagina) || 10,
      });

      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async obter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const resultado = await tarefaService.obter(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = atualizarTarefaSchema.parse(req.body);

      if (dados.execucoes) {
        dados.execucoes = dados.execucoes.map((e) => ({
          ...e,
          data: new Date(e.data as any),
        }));
      }

      const resultado = await tarefaService.atualizar(familiaId, id, dados);
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
      const resultado = await tarefaService.remover(familiaId, id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async concluir(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;
      const dados = concluirTarefaSchema.parse(req.body);

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(
        req.usuario!.id,
        familiaId,
      );
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Você não é membro desta família' });
        return;
      }

      const resultado = await tarefaService.concluir(familiaId, id, dados.execucaoId, membro.id);
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

  async concluirExecucao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, execucaoId } = req.params;
      const { concluidoPorId } = concluirExecucaoSchema.parse(req.body);
      const resultado = await tarefaService.concluirExecucao(familiaId, execucaoId, concluidoPorId);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Bad Request', message: err.errors.map((e) => e.message) });
        return;
      }
      next(err);
    }
  },

  async cancelarExecucao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, execucaoId } = req.params;
      const resultado = await tarefaService.cancelarExecucao(familiaId, execucaoId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizarExecucao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, execucaoId } = req.params;
      const { data } = atualizarExecucaoSchema.parse(req.body);
      const resultado = await tarefaService.atualizarExecucao(familiaId, execucaoId, new Date(data));
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Bad Request', message: err.errors.map((e) => e.message) });
        return;
      }
      next(err);
    }
  },

  async urgentes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await tarefaService.urgentes(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async ranking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await tarefaService.ranking(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async resumo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await tarefaService.resumo(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async duplicar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, id } = req.params;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(
        req.usuario!.id,
        familiaId,
      );
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Você não é membro desta família' });
        return;
      }

      const resultado = await tarefaService.duplicar(familiaId, id, membro.id);
      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  },
};
