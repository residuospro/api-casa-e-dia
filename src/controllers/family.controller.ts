import { Response, NextFunction } from 'express';
import { familyService } from '../services/family.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { ZodError } from 'zod';
import multer from 'multer';

const cadastrarDependenteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  fotoPerfil: z.string().optional(),
  genero: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
  tipoPessoa: z.enum(['MARIDO', 'ESPOSA', 'FILHO', 'FILHA', 'OUTRO']),
});

const convidarSchema = z.object({
  email: z.string().email('Email inválido'),
  tipoPessoa: z.enum(['MARIDO', 'ESPOSA', 'FILHO', 'FILHA', 'OUTRO']),
  permissao: z.enum(['ADMIN', 'USUARIO']),
});

const atualizarMembroSchema = z.object({
  nome: z.string().min(1).optional(),
  fotoPerfil: z.string().optional(),
  genero: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']).nullable().optional(),
  tipoPessoa: z.enum(['MARIDO', 'ESPOSA', 'FILHO', 'FILHA', 'OUTRO']).optional(),
  permissao: z.enum(['ADMIN', 'USUARIO']).nullable().optional(),
});

const criarFamiliaSchema = z.object({
  nome: z.string().min(1, 'Nome da família é obrigatório'),
  tipoPessoa: z.enum(['MARIDO', 'ESPOSA', 'FILHO', 'FILHA', 'OUTRO']),
});

const atualizarFamiliaSchema = z.object({
  nome: z.string().min(1, 'Nome da família é obrigatório'),
});

const responderConviteSchema = z.object({
  aceito: z.boolean(),
});

export const familyController = {
  async criarFamilia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dados = criarFamiliaSchema.parse(req.body);
      const resultado = await familyService.criarFamilia(
        req.usuario!.id,
        dados.nome,
        dados.tipoPessoa,
      );
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

  async listarFamilias(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await familyService.listarFamilias(req.usuario!.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async obterFamilia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await familyService.obterFamilia(req.usuario!.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizarFamilia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = atualizarFamiliaSchema.parse(req.body);
      const resultado = await familyService.atualizarFamilia(
        req.usuario!.id,
        familiaId,
        dados.nome,
      );
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

  async removerFamilia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await familyService.removerFamilia(req.usuario!.id, familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async convidarMembro(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = convidarSchema.parse(req.body);
      const resultado = await familyService.convidarMembro({
        ...dados,
        familiaId,
        solicitante: { id: req.usuario!.id, nome: req.usuario!.nome, fotoPerfil: req.usuario!.fotoPerfil },
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

  async cadastrarDependente(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const dados = cadastrarDependenteSchema.parse({
        ...req.body,
        fotoPerfil: req.file ? `/uploads/${req.file.filename}` : req.body.fotoPerfil || undefined,
      });
      const resultado = await familyService.cadastrarDependente({ ...dados, familiaId });
      res.status(201).json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      if (err instanceof Error && err.message.includes('Apenas imagens')) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      next(err);
    }
  },

  async listarConvitesPendentes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await familyService.listarConvitesPendentes(req.usuario!.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async responderConvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { membroId } = req.params;
      const { aceito } = responderConviteSchema.parse(req.body);
      const resultado = await familyService.responderConvite(req.usuario!.id, membroId, aceito);
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

  async listarMembros(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await familyService.listarMembros(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async listarOpcoesMembros(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const resultado = await familyService.listarOpcoesMembros(familiaId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async buscarMembros(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;
      const { termoBusca } = req.query;

      if (!termoBusca || typeof termoBusca !== 'string' || termoBusca.trim().length === 0) {
        res
          .status(400)
          .json({ error: 'Bad Request', message: 'Parâmetro de busca "termoBusca" é obrigatório' });
        return;
      }

      const resultado = await familyService.buscarMembros(familiaId, termoBusca.trim());
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async obterMembro(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, membroId } = req.params;
      const resultado = await familyService.obterMembro(familiaId, membroId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async atualizarMembro(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, membroId } = req.params;
      const dados = atualizarMembroSchema.parse({
        ...req.body,
        fotoPerfil: req.file ? `/uploads/${req.file.filename}` : req.body.fotoPerfil || undefined,
      });
      const resultado = await familyService.atualizarMembro(familiaId, membroId, dados);
      res.json(resultado);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.errors.map((e) => e.message),
        });
        return;
      }
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      if (err instanceof Error && err.message.includes('Apenas imagens')) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      next(err);
    }
  },

  async removerMembro(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, membroId } = req.params;
      const resultado = await familyService.removerMembro(familiaId, membroId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  async reEnviarConvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId, membroId } = req.params;
      const resultado = await familyService.reEnviarConvite(familiaId, membroId);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
};
