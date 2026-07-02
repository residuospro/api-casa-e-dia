import { Response, NextFunction } from 'express';
import { tarefaService } from '../services/tarefa.service';
import { familyRepository } from '../repositories/family.repository';
import { AuthRequest } from '../middlewares/auth.middleware';
import { criarTarefaSchema, atualizarTarefaSchema, concluirTarefaSchema } from '../validators/tarefa.validator';
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

      const resultado = await tarefaService.criar({
        ...dados,
        familiaId,
        criadoPorId: membro.id,
        responsavelAtualId: dados.responsavelAtualId,
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

      const resultado = await tarefaService.concluir(familiaId, id, membro.id, dados.observacao ?? undefined);
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

  async ranking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await tarefaService.ranking(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
};
