import { authController } from './auth.controller';
import { authService } from '../services/auth.service';
import { ZodError } from 'zod';

jest.mock('../services/auth.service', () => ({
  authService: {
    cadastrar: jest.fn(),
    login: jest.fn(),
    primeiroAcesso: jest.fn(),
  },
  cadastrarSchema: {
    parse: jest.fn(),
  },
  loginSchema: {
    parse: jest.fn(),
  },
  primeiroAcessoSchema: {
    parse: jest.fn(),
  },
}));

import { cadastrarSchema, loginSchema, primeiroAcessoSchema } from '../services/auth.service';

function mockReq(body: any) {
  return { body } as any;
}

function mockRes() {
  const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  return res;
}

describe('AuthController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cadastrar', () => {
    it('deve chamar authService.cadastrar e retornar 201', async () => {
      const dto = {
        nome: 'Kallif',
        email: 'kallif@email.com',
        senha: '123456',
        genero: 'MASCULINO',
      };

      (cadastrarSchema.parse as jest.Mock).mockReturnValue(dto);
      (authService.cadastrar as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        usuario: { id: '1', nome: 'Kallif', email: 'kallif@email.com', genero: 'MASCULINO' },
      });

      const req = mockReq(dto);
      const res = mockRes();
      const next = jest.fn();

      await authController.cadastrar(req, res, next);

      expect(authService.cadastrar).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: 'token',
        usuario: { id: '1', nome: 'Kallif', email: 'kallif@email.com', genero: 'MASCULINO' },
      });
    });

    it('deve retornar 400 se validação falhar', async () => {
      (cadastrarSchema.parse as jest.Mock).mockImplementation(() => {
        throw new ZodError([
          {
            message: 'Email inválido',
            path: ['email'],
            code: 'invalid_string',
            validation: 'email',
          },
        ]);
      });

      const req = mockReq({});
      const res = mockRes();
      const next = jest.fn();

      await authController.cadastrar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Bad Request' }));
      expect(authService.cadastrar).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('deve chamar authService.login', async () => {
      const dto = { email: 'kallif@email.com', senha: '123456' };

      (loginSchema.parse as jest.Mock).mockReturnValue(dto);
      (authService.login as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        usuario: { id: '1', nome: 'Kallif', email: 'kallif@email.com' },
      });

      const req = mockReq(dto);
      const res = mockRes();
      const next = jest.fn();

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: 'token',
        usuario: { id: '1', nome: 'Kallif', email: 'kallif@email.com' },
      });
    });
  });

  describe('primeiroAcesso', () => {
    it('deve chamar authService.primeiroAcesso', async () => {
      const dto = { token: 'token-valido', senha: '123456' };

      (primeiroAcessoSchema.parse as jest.Mock).mockReturnValue(dto);
      (authService.primeiroAcesso as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        usuario: { id: '1', nome: 'Maria', email: 'maria@email.com', genero: 'FEMININO' },
      });

      const req = mockReq(dto);
      const res = mockRes();
      const next = jest.fn();

      await authController.primeiroAcesso(req, res, next);

      expect(authService.primeiroAcesso).toHaveBeenCalledWith(dto);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: 'token',
        usuario: { id: '1', nome: 'Maria', email: 'maria@email.com', genero: 'FEMININO' },
      });
    });

    it('deve retornar 400 se validação falhar', async () => {
      (primeiroAcessoSchema.parse as jest.Mock).mockImplementation(() => {
        throw new ZodError([
          {
            message: 'Token é obrigatório',
            path: ['token'],
            code: 'invalid_string',
            validation: 'regex',
          },
        ]);
      });

      const req = mockReq({});
      const res = mockRes();
      const next = jest.fn();

      await authController.primeiroAcesso(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(authService.primeiroAcesso).not.toHaveBeenCalled();
    });
  });
});
