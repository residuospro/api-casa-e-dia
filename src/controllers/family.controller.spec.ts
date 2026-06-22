import { familyController } from './family.controller';

jest.mock('../services/family.service', () => ({
  familyService: {
    criarFamilia: jest.fn(),
    listarFamilias: jest.fn(),
    obterFamilia: jest.fn(),
    atualizarFamilia: jest.fn(),
    removerFamilia: jest.fn(),
    convidarMembro: jest.fn(),
    cadastrarDependente: jest.fn(),
    listarConvitesPendentes: jest.fn(),
    responderConvite: jest.fn(),
    listarMembros: jest.fn(),
    obterMembro: jest.fn(),
    atualizarMembro: jest.fn(),
    removerMembro: jest.fn(),
    reEnviarConvite: jest.fn(),
  },
}));

function mockReq(body: any, params?: any) {
  return { body, params } as any;
}

function mockReqAuth(body: any, params?: any) {
  return { body, params, usuario: { id: 'user-id' } } as any;
}

function mockRes() {
  const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  return res;
}

describe('FamilyController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criarFamilia', () => {
    it('deve retornar 201 ao criar família', async () => {
      const body = { nome: 'Família Teste', tipoPessoa: 'MARIDO' };
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.criarFamilia.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste', _count: { membros: 1 } });

      const req = mockReqAuth(body);
      const res = mockRes();
      const next = jest.fn();

      await familyController.criarFamilia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'fam-id', nome: 'Família Teste', _count: { membros: 1 } });
    });

    it('deve retornar 400 se nome estiver vazio', async () => {
      const req = mockReqAuth({ nome: '', tipoPessoa: 'MARIDO' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.criarFamilia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('listarFamilias', () => {
    it('deve retornar 200 com lista', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.listarFamilias.mockResolvedValue([{ id: 'fam-id', nome: 'Família Teste' }]);

      const req = mockReqAuth({});
      const res = mockRes();
      const next = jest.fn();

      await familyController.listarFamilias(req, res, next);

      expect(res.json).toHaveBeenCalledWith([{ id: 'fam-id', nome: 'Família Teste' }]);
    });
  });

  describe('obterFamilia', () => {
    it('deve retornar 200 com array de famílias', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.obterFamilia.mockResolvedValue([{ id: 'fam-id', nome: 'Família Teste' }]);

      const req = mockReqAuth({});
      const res = mockRes();
      const next = jest.fn();

      await familyController.obterFamilia(req, res, next);

      expect(res.json).toHaveBeenCalledWith([{ id: 'fam-id', nome: 'Família Teste' }]);
    });
  });

  describe('atualizarFamilia', () => {
    it('deve retornar 200 com família atualizada', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.atualizarFamilia.mockResolvedValue({ id: 'fam-id', nome: 'Novo Nome' });

      const req = mockReqAuth({ nome: 'Novo Nome' }, { familiaId: 'fam-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.atualizarFamilia(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 'fam-id', nome: 'Novo Nome' });
    });

    it('deve retornar 400 se nome estiver vazio', async () => {
      const req = mockReqAuth({ nome: '' }, { familiaId: 'fam-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.atualizarFamilia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removerFamilia', () => {
    it('deve retornar 200 com mensagem', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.removerFamilia.mockResolvedValue({ message: 'Família removida com sucesso' });

      const req = mockReqAuth({}, { familiaId: 'fam-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.removerFamilia(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ message: 'Família removida com sucesso' });
    });
  });

  describe('convidarMembro', () => {
    it('deve retornar 201 ao convidar membro', async () => {
      const body = {
        email: 'maria@email.com',
        tipoPessoa: 'ESPOSA',
        permissao: 'USUARIO',
      };
      const params = { familiaId: 'fam-id' };

      const { familyService } = jest.requireMock('../services/family.service');
      familyService.convidarMembro.mockResolvedValue({ message: 'Convite enviado com sucesso' });

      const req = mockReqAuth(body, params);
      const res = mockRes();
      const next = jest.fn();

      await familyController.convidarMembro(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Convite enviado com sucesso' });
    });

    it('deve retornar 400 se email for inválido', async () => {
      const req = mockReqAuth({ email: 'invalido', tipoPessoa: 'ESPOSA', permissao: 'USUARIO' }, { familiaId: 'fam-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.convidarMembro(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deve retornar 400 se email estiver faltando', async () => {
      const req = mockReqAuth({ tipoPessoa: 'ESPOSA', permissao: 'USUARIO' }, { familiaId: 'fam-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.convidarMembro(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cadastrarDependente', () => {
    it('deve retornar 201 ao cadastrar dependente', async () => {
      const body = {
        nome: 'Pedrinho',
        genero: 'MASCULINO',
        tipoPessoa: 'FILHO',
      };
      const params = { familiaId: 'fam-id' };

      const { familyService } = jest.requireMock('../services/family.service');
      familyService.cadastrarDependente.mockResolvedValue({ message: 'Dependente cadastrado com sucesso' });

      const req = mockReqAuth(body, params);
      const res = mockRes();
      const next = jest.fn();

      await familyController.cadastrarDependente(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Dependente cadastrado com sucesso' });
    });

    it('deve retornar 400 se nome estiver vazio', async () => {
      const req = mockReqAuth(
        { nome: '', genero: 'MASCULINO', tipoPessoa: 'FILHO' },
        { familiaId: 'fam-id' },
      );
      const res = mockRes();
      const next = jest.fn();

      await familyController.cadastrarDependente(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('listarConvitesPendentes', () => {
    it('deve retornar 200 com lista de convites', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.listarConvitesPendentes.mockResolvedValue([{ id: 'c1', familia: { nome: 'Família Teste' } }]);

      const req = mockReqAuth({});
      const res = mockRes();
      const next = jest.fn();

      await familyController.listarConvitesPendentes(req, res, next);

      expect(res.json).toHaveBeenCalledWith([{ id: 'c1', familia: { nome: 'Família Teste' } }]);
    });
  });

  describe('responderConvite', () => {
    it('deve retornar 200 ao aceitar convite', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.responderConvite.mockResolvedValue({ message: 'Convite aceito com sucesso' });

      const req = mockReqAuth({ aceito: true }, { membroId: 'mem-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.responderConvite(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ message: 'Convite aceito com sucesso' });
    });

    it('deve retornar 400 se aceito não for booleano', async () => {
      const req = mockReqAuth({ aceito: 'sim' }, { membroId: 'mem-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.responderConvite(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('listarMembros', () => {
    it('deve retornar 200 com membros', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.listarMembros.mockResolvedValue([{ id: 'm1', nome: 'João' }]);

      const req = mockReqAuth({}, { familiaId: 'fam-id' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.listarMembros(req, res, next);

      expect(res.json).toHaveBeenCalledWith([{ id: 'm1', nome: 'João' }]);
    });
  });

  describe('obterMembro', () => {
    it('deve retornar 200 com membro', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.obterMembro.mockResolvedValue({ id: 'm1', nome: 'João' });

      const req = mockReqAuth({}, { familiaId: 'fam-id', membroId: 'm1' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.obterMembro(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 'm1', nome: 'João' });
    });
  });

  describe('atualizarMembro', () => {
    it('deve retornar 200 com membro atualizado', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.atualizarMembro.mockResolvedValue({ id: 'm1', tipoPessoa: 'FILHA' });

      const req = mockReqAuth({ tipoPessoa: 'FILHA' }, { familiaId: 'fam-id', membroId: 'm1' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.atualizarMembro(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 'm1', tipoPessoa: 'FILHA' });
    });
  });

  describe('removerMembro', () => {
    it('deve retornar 200 com mensagem', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.removerMembro.mockResolvedValue({ message: 'Membro removido com sucesso' });

      const req = mockReqAuth({}, { familiaId: 'fam-id', membroId: 'm1' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.removerMembro(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ message: 'Membro removido com sucesso' });
    });
  });

  describe('reEnviarConvite', () => {
    it('deve retornar 200 com mensagem', async () => {
      const { familyService } = jest.requireMock('../services/family.service');
      familyService.reEnviarConvite.mockResolvedValue({ message: 'Convite reenviado com sucesso' });

      const req = mockReqAuth({}, { familiaId: 'fam-id', membroId: 'm1' });
      const res = mockRes();
      const next = jest.fn();

      await familyController.reEnviarConvite(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ message: 'Convite reenviado com sucesso' });
    });
  });
});
