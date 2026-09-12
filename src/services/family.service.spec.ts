import { FamilyService } from './family.service';
import { AppError } from './auth.service';

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findFamiliaById: jest.fn(),
    findMembroByUsuarioAndFamilia: jest.fn(),
    createMembroFamilia: jest.fn(),
    findMembrosByFamilia: jest.fn(),
    findMembroById: jest.fn(),
    updateMembro: jest.fn(),
    deleteMembro: jest.fn(),
    updateConviteEnviado: jest.fn(),
    updateTokenPrimeiroAcesso: jest.fn(),
    createFamilia: jest.fn(),
    findFamiliasByUsuario: jest.fn(),
    updateFamilia: jest.fn(),
    deleteFamilia: jest.fn(),
    findConvitesPendentes: jest.fn(),
    updateMembroStatus: jest.fn(),
    findEstatisticasMembros: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../repositories/auth.repository', () => ({
  authRepository: {
    findUsuarioByEmail: jest.fn(),
  },
}));

jest.mock('./email.service', () => ({
  sendInviteEmail: jest.fn(),
}));

jest.mock('./notification.service', () => ({
  notificationService: {
    criar: jest.fn(),
  },
}));

const { familyRepository } = jest.requireMock('../repositories/family.repository');
const { authRepository } = jest.requireMock('../repositories/auth.repository');
const { sendInviteEmail } = jest.requireMock('./email.service');

function makeMembro(overrides = {}) {
  return {
    id: 'mem-id',
    usuarioId: 'user-id',
    familiaId: 'fam-id',
    nome: null,
    fotoPerfil: null,
    genero: null,
    tipoPessoa: 'ESPOSA',
    permissao: 'USUARIO',
    dependente: false,
    status: 'PENDENTE',
    conviteEnviado: true,
    criadoEm: new Date(),
    usuario: {
      id: 'user-id',
      nome: 'Maria',
      email: 'maria@email.com',
      fotoPerfil: null,
      genero: 'FEMININO',
    },
    ...overrides,
  };
}

const service = new FamilyService();

describe('FamilyService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convidarMembro', () => {
    const solicitante = { id: 'admin-id', nome: 'João', fotoPerfil: null };
    const dto = {
      familiaId: 'fam-id',
      email: 'maria@email.com',
      tipoPessoa: 'ESPOSA',
      permissao: 'USUARIO',
      solicitante,
    };

    it('deve buscar usuário por email, criar membro e enviar convite', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      authRepository.findUsuarioByEmail.mockResolvedValue({
        id: 'user-id',
        nome: 'Maria',
        email: 'maria@email.com',
      });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue(null);
      familyRepository.createMembroFamilia.mockResolvedValue({ id: 'mem-id' });
      familyRepository.findMembroById.mockResolvedValue(makeMembro());
      sendInviteEmail.mockResolvedValue(undefined);

      const resultado = await service.convidarMembro(dto);

      expect(authRepository.findUsuarioByEmail).toHaveBeenCalledWith('maria@email.com');
      expect(familyRepository.createMembroFamilia).toHaveBeenCalledWith({
        usuarioId: 'user-id',
        familiaId: 'fam-id',
        tipoPessoa: 'ESPOSA',
        permissao: 'USUARIO',
        status: 'PENDENTE',
      });
      expect(sendInviteEmail).toHaveBeenCalledWith('maria@email.com', 'Maria', 'Família Teste');
      expect(resultado.conviteEnviado).toBe(true);
    });

    it('deve criar membro mesmo se email falhar', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      authRepository.findUsuarioByEmail.mockResolvedValue({
        id: 'user-id',
        nome: 'Maria',
        email: 'maria@email.com',
      });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue(null);
      familyRepository.createMembroFamilia.mockResolvedValue({ id: 'mem-id' });
      familyRepository.findMembroById.mockResolvedValue(makeMembro({ conviteEnviado: false }));
      sendInviteEmail.mockRejectedValue(new Error('Falha no email'));

      const resultado = await service.convidarMembro(dto);

      expect(sendInviteEmail).toHaveBeenCalled();
      expect(familyRepository.updateConviteEnviado).not.toHaveBeenCalled();
      expect(resultado.conviteEnviado).toBe(false);
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(service.convidarMembro(dto)).rejects.toThrow(AppError);
    });

    it('deve lançar erro se usuário não for encontrado', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      authRepository.findUsuarioByEmail.mockResolvedValue(null);

      await expect(service.convidarMembro(dto)).rejects.toThrow(AppError);
    });

    it('deve lançar erro se usuário já for membro', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      authRepository.findUsuarioByEmail.mockResolvedValue({
        id: 'user-id',
        nome: 'Maria',
        email: 'maria@email.com',
      });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ id: 'mem-id' });

      await expect(service.convidarMembro(dto)).rejects.toThrow(AppError);
    });
  });

  describe('cadastrarDependente', () => {
    it('deve cadastrar dependente sem usuario', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      familyRepository.createMembroFamilia.mockResolvedValue(
        makeMembro({
          usuarioId: null,
          nome: 'Pedrinho',
          fotoPerfil: null,
          tipoPessoa: 'FILHO',
          permissao: 'USUARIO',
          dependente: true,
          conviteEnviado: true,
          status: 'ACEITO',
          usuario: null,
        }),
      );

      const resultado = await service.cadastrarDependente({
        familiaId: 'fam-id',
        nome: 'Pedrinho',
        genero: 'MASCULINO',
        tipoPessoa: 'FILHO',
      });

      expect(familyRepository.createMembroFamilia).toHaveBeenCalledWith({
        usuarioId: null,
        familiaId: 'fam-id',
        nome: 'Pedrinho',
        fotoPerfil: null,
        genero: 'MASCULINO',
        tipoPessoa: 'FILHO',
        permissao: 'USUARIO',
        dependente: true,
        conviteEnviado: true,
        status: 'ACEITO',
      });
      expect(resultado.membro.nome).toBe('Pedrinho');
    });

    it('deve cadastrar dependente com fotoPerfil', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      familyRepository.createMembroFamilia.mockResolvedValue(
        makeMembro({
          usuarioId: null,
          nome: 'Pedrinho',
          fotoPerfil: 'http://foto.com/pedrinho.jpg',
          tipoPessoa: 'FILHO',
          permissao: 'USUARIO',
          dependente: true,
          conviteEnviado: true,
          status: 'ACEITO',
          usuario: null,
        }),
      );

      const resultado = await service.cadastrarDependente({
        familiaId: 'fam-id',
        nome: 'Pedrinho',
        genero: 'MASCULINO',
        tipoPessoa: 'FILHO',
        fotoPerfil: 'http://foto.com/pedrinho.jpg',
      });

      expect(familyRepository.createMembroFamilia).toHaveBeenCalledWith({
        usuarioId: null,
        familiaId: 'fam-id',
        nome: 'Pedrinho',
        fotoPerfil: 'http://foto.com/pedrinho.jpg',
        genero: 'MASCULINO',
        tipoPessoa: 'FILHO',
        permissao: 'USUARIO',
        dependente: true,
        conviteEnviado: true,
        status: 'ACEITO',
      });
      expect(resultado.membro.fotoPerfil).toBe('http://foto.com/pedrinho.jpg');
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(
        service.cadastrarDependente({
          familiaId: 'inválido',
          nome: 'Pedrinho',
          genero: 'MASCULINO',
          tipoPessoa: 'FILHO',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('listarConvitesPendentes', () => {
    it('deve retornar convites pendentes do usuário', async () => {
      familyRepository.findConvitesPendentes.mockResolvedValue([
        { id: 'c1', familia: { nome: 'Família Teste' } },
      ]);

      const resultado = await service.listarConvitesPendentes('user-id');

      expect(familyRepository.findConvitesPendentes).toHaveBeenCalledWith('user-id');
      expect(resultado).toHaveLength(1);
    });
  });

  describe('responderConvite', () => {
    it('deve aceitar convite', async () => {
      familyRepository.findMembroById.mockResolvedValue(makeMembro({ status: 'PENDENTE' }));
      familyRepository.updateMembroStatus.mockResolvedValue(makeMembro({ status: 'ACEITO' }));

      const resultado = await service.responderConvite('user-id', 'mem-id', true);

      expect(familyRepository.updateMembroStatus).toHaveBeenCalledWith('mem-id', 'ACEITO');
      expect(resultado.message).toBe('Convite aceito com sucesso');
    });

    it('deve recusar convite', async () => {
      familyRepository.findMembroById.mockResolvedValue(makeMembro({ status: 'PENDENTE' }));
      familyRepository.updateMembroStatus.mockResolvedValue(makeMembro({ status: 'RECUSADO' }));

      const resultado = await service.responderConvite('user-id', 'mem-id', false);

      expect(familyRepository.updateMembroStatus).toHaveBeenCalledWith('mem-id', 'RECUSADO');
      expect(resultado.message).toBe('Convite recusado com sucesso');
    });

    it('deve lançar erro se convite não for do usuário', async () => {
      familyRepository.findMembroById.mockResolvedValue(
        makeMembro({ usuarioId: 'outro-user', status: 'PENDENTE' }),
      );

      await expect(service.responderConvite('user-id', 'mem-id', true)).rejects.toThrow(AppError);
    });

    it('deve lançar erro se convite já foi respondido', async () => {
      familyRepository.findMembroById.mockResolvedValue(makeMembro({ status: 'ACEITO' }));

      await expect(service.responderConvite('user-id', 'mem-id', true)).rejects.toThrow(AppError);
    });

    it('deve lançar erro se convite não existir', async () => {
      familyRepository.findMembroById.mockResolvedValue(null);

      await expect(service.responderConvite('user-id', 'mem-id', true)).rejects.toThrow(AppError);
    });
  });

  describe('reEnviarConvite', () => {
    it('deve reenviar convite', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      familyRepository.findMembroById.mockResolvedValue(
        makeMembro({
          usuario: {
            id: 'user-id',
            nome: 'Maria',
            email: 'maria@email.com',
            tokenPrimeiroAcesso: 'token-valido',
            tokenExpiraEm: new Date(Date.now() + 86400000),
          },
        }),
      );
      sendInviteEmail.mockResolvedValue(undefined);

      const resultado = await service.reEnviarConvite('fam-id', 'mem-id');

      expect(sendInviteEmail).toHaveBeenCalledWith('maria@email.com', 'Maria', 'Família Teste');
      expect(familyRepository.updateConviteEnviado).toHaveBeenCalledWith('mem-id');
      expect(resultado).toEqual({ message: 'Convite reenviado com sucesso' });
    });

    it('deve lançar erro se membro não for encontrado', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue(null);

      await expect(service.reEnviarConvite('fam-id', 'mem-id')).rejects.toThrow(AppError);
    });
  });

  describe('listarMembros', () => {
    it('deve listar membros da família', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembrosByFamilia.mockResolvedValue([
        makeMembro({
          id: 'm1',
          usuarioId: 'u1',
          nome: null,
          tipoPessoa: 'MARIDO',
          permissao: 'ADMIN',
          usuario: {
            id: 'u1',
            nome: 'João',
            email: 'joao@email.com',
            fotoPerfil: null,
            genero: 'MASCULINO',
          },
        }),
        makeMembro({
          id: 'm2',
          usuarioId: null,
          nome: 'Pedrinho',
          tipoPessoa: 'FILHO',
          permissao: null,
          dependente: true,
          conviteEnviado: false,
          usuario: null,
        }),
      ]);

      familyRepository.findEstatisticasMembros.mockResolvedValue({
        m1: { tarefas: 2, participante: 3, executou: 4, perdeu: 1 },
        m2: { tarefas: 0, participante: 1, executou: 0, perdeu: 2 },
      });

      const resultado = await service.listarMembros('fam-id');

      expect(resultado).toHaveLength(2);
      expect(resultado[0].nome).toBe('João');
      expect(resultado[1].nome).toBe('Pedrinho');
      expect(resultado[0]).toMatchObject({ tarefas: 2, participante: 3, executou: 4, perdeu: 1 });
      expect(resultado[1]).toMatchObject({ tarefas: 0, participante: 1, executou: 0, perdeu: 2 });
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(service.listarMembros('inválido')).rejects.toThrow(AppError);
    });
  });

  describe('obterMembro', () => {
    it('deve retornar membro', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue(
        makeMembro({
          id: 'm1',
          usuarioId: 'u1',
          nome: null,
          tipoPessoa: 'MARIDO',
          permissao: 'ADMIN',
          usuario: {
            id: 'u1',
            nome: 'João',
            email: 'joao@email.com',
            fotoPerfil: null,
            genero: 'MASCULINO',
          },
        }),
      );

      const resultado = await service.obterMembro('fam-id', 'm1');

      expect(resultado.nome).toBe('João');
    });

    it('deve lançar erro se membro não pertencer à família', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({ id: 'm1', familiaId: 'outra-fam' });

      await expect(service.obterMembro('fam-id', 'm1')).rejects.toThrow(AppError);
    });
  });

  describe('atualizarMembro', () => {
    it('deve atualizar tipoPessoa de um dependente', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: null,
        familiaId: 'fam-id',
      });
      familyRepository.updateMembro.mockResolvedValue(
        makeMembro({
          id: 'm1',
          usuarioId: null,
          nome: 'Pedrinho',
          tipoPessoa: 'FILHA',
          permissao: null,
          dependente: true,
          conviteEnviado: false,
          usuario: null,
        }),
      );

      const resultado = await service.atualizarMembro('fam-id', 'm1', { tipoPessoa: 'FILHA' });

      expect(familyRepository.updateMembro).toHaveBeenCalledWith('m1', { tipoPessoa: 'FILHA' });
      expect(resultado.tipoPessoa).toBe('FILHA');
    });

    it('deve atualizar genero de um dependente', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: null,
        familiaId: 'fam-id',
      });
      familyRepository.updateMembro.mockResolvedValue(
        makeMembro({
          id: 'm1',
          usuarioId: null,
          nome: 'Pedrinho',
          genero: 'FEMININO',
          tipoPessoa: 'FILHA',
          permissao: null,
          dependente: true,
          conviteEnviado: false,
          usuario: null,
        }),
      );

      const resultado = await service.atualizarMembro('fam-id', 'm1', { genero: 'FEMININO' });

      expect(familyRepository.updateMembro).toHaveBeenCalledWith('m1', { genero: 'FEMININO' });
      expect(resultado.genero).toBe('FEMININO');
    });

    it('deve atualizar nome e fotoPerfil de um dependente', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: null,
        familiaId: 'fam-id',
      });
      familyRepository.updateMembro.mockResolvedValue(
        makeMembro({
          id: 'm1',
          usuarioId: null,
          nome: 'Novo Nome',
          fotoPerfil: '/uploads/foto.jpg',
          tipoPessoa: 'FILHO',
          permissao: null,
          dependente: true,
          conviteEnviado: false,
          usuario: null,
        }),
      );

      const resultado = await service.atualizarMembro('fam-id', 'm1', {
        nome: 'Novo Nome',
        fotoPerfil: '/uploads/foto.jpg',
      });

      expect(familyRepository.updateMembro).toHaveBeenCalledWith('m1', {
        nome: 'Novo Nome',
        fotoPerfil: '/uploads/foto.jpg',
      });
      expect(resultado.nome).toBe('Novo Nome');
    });

    it('deve lançar erro ao definir permissão para dependente', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: null,
        familiaId: 'fam-id',
      });

      await expect(
        service.atualizarMembro('fam-id', 'm1', { permissao: 'USUARIO' }),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro ao alterar nome de membro com usuário', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: 'u1',
        familiaId: 'fam-id',
      });

      await expect(service.atualizarMembro('fam-id', 'm1', { nome: 'Novo' })).rejects.toThrow(
        AppError,
      );
    });

    it('deve lançar erro ao alterar genero de membro com usuário', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: 'u1',
        familiaId: 'fam-id',
      });

      await expect(service.atualizarMembro('fam-id', 'm1', { genero: 'FEMININO' })).rejects.toThrow(
        AppError,
      );
    });

    it('deve lançar erro ao alterar fotoPerfil de membro com usuário', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({
        id: 'm1',
        usuarioId: 'u1',
        familiaId: 'fam-id',
      });

      await expect(
        service.atualizarMembro('fam-id', 'm1', { fotoPerfil: '/uploads/foto.jpg' }),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se membro não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue(null);

      await expect(
        service.atualizarMembro('fam-id', 'm1', { tipoPessoa: 'FILHA' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('removerMembro', () => {
    it('deve remover membro', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({ id: 'm1', familiaId: 'fam-id' });

      const resultado = await service.removerMembro('fam-id', 'm1');

      expect(familyRepository.deleteMembro).toHaveBeenCalledWith('m1');
      expect(resultado).toEqual({ message: 'Membro removido com sucesso' });
    });

    it('deve lançar erro se membro não pertencer à família', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroById.mockResolvedValue({ id: 'm1', familiaId: 'outra-fam' });

      await expect(service.removerMembro('fam-id', 'm1')).rejects.toThrow(AppError);
    });
  });

  describe('criarFamilia', () => {
    it('deve criar família e vincular usuário como ADMIN', async () => {
      familyRepository.transaction.mockImplementation(async (cb: any) =>
        cb({
          familia: {
            create: jest
              .fn()
              .mockResolvedValue({ id: 'fam-id', nome: 'Família Teste', criadoEm: new Date() }),
          },
          membroFamilia: {
            create: jest.fn().mockResolvedValue({ id: 'mem-id' }),
          },
        }),
      );

      const resultado = await service.criarFamilia('user-id', 'Família Teste', 'MARIDO');

      expect(resultado.id).toBe('fam-id');
      expect(resultado.nome).toBe('Família Teste');
    });
  });

  describe('listarFamilias', () => {
    it('deve listar famílias do usuário', async () => {
      familyRepository.findFamiliasByUsuario.mockResolvedValue([
        { id: 'fam-id', nome: 'Família Teste', criadoEm: new Date(), _count: { membros: 2 } },
      ]);

      const resultado = await service.listarFamilias('user-id');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Família Teste');
    });
  });

  describe('obterFamilia', () => {
    it('deve retornar array de famílias do usuário', async () => {
      familyRepository.findFamiliasByUsuario.mockResolvedValue([
        { id: 'fam-id', nome: 'Família Teste', _count: { membros: 2 } },
      ]);

      const resultado = await service.obterFamilia('user-id');

      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado[0].nome).toBe('Família Teste');
    });

    it('deve retornar array vazio se usuário não tiver família', async () => {
      familyRepository.findFamiliasByUsuario.mockResolvedValue([]);

      const resultado = await service.obterFamilia('user-id');

      expect(resultado).toEqual([]);
    });
  });

  describe('atualizarFamilia', () => {
    it('deve atualizar nome da família', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Antigo' });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ permissao: 'ADMIN' });
      familyRepository.updateFamilia.mockResolvedValue({
        id: 'fam-id',
        nome: 'Novo',
        _count: { membros: 2 },
      });

      const resultado = await service.atualizarFamilia('user-id', 'fam-id', 'Novo');

      expect(familyRepository.findMembroByUsuarioAndFamilia).toHaveBeenCalledWith(
        'user-id',
        'fam-id',
      );
      expect(resultado.nome).toBe('Novo');
    });

    it('deve lançar erro se não for ADMIN', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ permissao: 'USUARIO' });

      await expect(service.atualizarFamilia('user-id', 'fam-id', 'Novo')).rejects.toThrow(AppError);
    });
  });

  describe('removerFamilia', () => {
    it('deve remover família e membros', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', _count: { membros: 2 } });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ permissao: 'ADMIN' });
      familyRepository.transaction.mockImplementation(async (cb: any) =>
        cb({
          membroFamilia: { deleteMany: jest.fn() },
          familia: { delete: jest.fn() },
        }),
      );

      const resultado = await service.removerFamilia('user-id', 'fam-id');

      expect(familyRepository.findMembroByUsuarioAndFamilia).toHaveBeenCalledWith(
        'user-id',
        'fam-id',
      );
      expect(resultado).toEqual({ message: 'Família removida com sucesso' });
    });

    it('deve lançar erro se não for ADMIN', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ permissao: 'USUARIO' });

      await expect(service.removerFamilia('user-id', 'fam-id')).rejects.toThrow(AppError);
    });
  });
});
