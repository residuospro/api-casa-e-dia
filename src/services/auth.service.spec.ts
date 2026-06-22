import { AuthService } from '../services/auth.service';
import { AppError } from '../services/auth.service';

jest.mock('../utils/avatar', () => ({
  generateAvatar: jest.fn().mockReturnValue('https://api.dicebear.com/9.x/avataaars/svg?seed=Kallif'),
}));

jest.mock('../repositories/auth.repository', () => ({
  authRepository: {
    findUsuarioByEmail: jest.fn(),
    findUsuarioById: jest.fn(),
    findUserFamilyProfile: jest.fn(),
    createUsuario: jest.fn(),
  },
}));

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findUsuarioByToken: jest.fn(),
    updateSenhaAndPrimeiroAcesso: jest.fn(),
  },
}));

const { authRepository } = jest.requireMock('../repositories/auth.repository');

const service = new AuthService();

describe('AuthService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cadastrar', () => {
    const dto = {
      nome: 'Kallif',
      email: 'kallif@email.com',
      senha: '123456',
      genero: 'MASCULINO' as const,
    };

    it('deve cadastrar usuário', async () => {
      authRepository.findUsuarioByEmail.mockResolvedValue(null);
      authRepository.createUsuario.mockResolvedValue({
        id: 'user-id',
        nome: dto.nome,
        email: dto.email,
        celular: null,
        fotoPerfil: null,
        genero: 'MASCULINO',
      });

      const resultado = await service.cadastrar(dto);

      expect(authRepository.findUsuarioByEmail).toHaveBeenCalledWith(dto.email);
      expect(authRepository.createUsuario).toHaveBeenCalledWith({
        nome: dto.nome,
        email: dto.email,
        senha: expect.any(String),
        celular: undefined,
        genero: 'MASCULINO',
        fotoPerfil: undefined,
      });
      expect(resultado).toEqual({
        accessToken: expect.any(String),
        usuario: { id: 'user-id', nome: dto.nome, email: dto.email, celular: null, fotoPerfil: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kallif', genero: 'MASCULINO' },
      });
    });

    it('não deve permitir email duplicado', async () => {
      authRepository.findUsuarioByEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.cadastrar(dto)).rejects.toThrow(AppError);
      expect(authRepository.createUsuario).not.toHaveBeenCalled();
    });
  });

  describe('primeiroAcesso', () => {
    const dto = { token: 'token-valido', senha: '123456' };

    it('deve definir senha e retornar token', async () => {
      const { familyRepository } = jest.requireMock('../repositories/family.repository');
      const bcrypt = require('bcryptjs');
      const senhaHash = bcrypt.hashSync(dto.senha, 10);

      familyRepository.findUsuarioByToken.mockResolvedValue({
        id: 'user-id',
        nome: 'Maria',
        email: 'maria@email.com',
        celular: null,
        genero: 'FEMININO',
        primeiroAcesso: true,
        tokenExpiraEm: new Date(Date.now() + 86400000),
        fotoPerfil: null,
      });
      familyRepository.updateSenhaAndPrimeiroAcesso.mockResolvedValue({});

      authRepository.findUserFamilyProfile.mockResolvedValue({ familiaId: 'fam-id' });

      const resultado = await service.primeiroAcesso(dto);

      expect(familyRepository.updateSenhaAndPrimeiroAcesso).toHaveBeenCalledWith('user-id', expect.any(String));
      expect(resultado).toEqual({
        accessToken: expect.any(String),
        familiaId: 'fam-id',
        usuario: {
          id: 'user-id',
          nome: 'Maria',
          email: 'maria@email.com',
          celular: null,
          fotoPerfil: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kallif',
          genero: 'FEMININO',
        },
      });
    });

    it('deve rejeitar token inválido', async () => {
      const { familyRepository } = jest.requireMock('../repositories/family.repository');
      familyRepository.findUsuarioByToken.mockResolvedValue(null);

      await expect(service.primeiroAcesso(dto)).rejects.toThrow(AppError);
    });

    it('deve rejeitar token expirado', async () => {
      const { familyRepository } = jest.requireMock('../repositories/family.repository');
      familyRepository.findUsuarioByToken.mockResolvedValue({
        id: 'user-id',
        primeiroAcesso: true,
        tokenExpiraEm: new Date(Date.now() - 86400000),
      });

      await expect(service.primeiroAcesso(dto)).rejects.toThrow(AppError);
    });

    it('deve rejeitar se senha já foi definida', async () => {
      const { familyRepository } = jest.requireMock('../repositories/family.repository');
      familyRepository.findUsuarioByToken.mockResolvedValue({
        id: 'user-id',
        primeiroAcesso: false,
        tokenExpiraEm: new Date(Date.now() + 86400000),
      });

      await expect(service.primeiroAcesso(dto)).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    const dto = { email: 'kallif@email.com', senha: '123456' };

    it('deve validar senha no login', async () => {
      const bcrypt = require('bcryptjs');
      const senhaHash = bcrypt.hashSync(dto.senha, 10);

      authRepository.findUsuarioByEmail.mockResolvedValue({
        id: 'user-id',
        nome: 'Kallif',
        email: dto.email,
        senha: senhaHash,
        celular: null,
        genero: 'MASCULINO',
      });

      authRepository.findUserFamilyProfile.mockResolvedValue({ familiaId: 'fam-id' });

      const resultado = await service.login(dto);

      expect(resultado).toEqual({
        accessToken: expect.any(String),
        familiaId: 'fam-id',
        usuario: { id: 'user-id', nome: 'Kallif', email: dto.email, celular: null, fotoPerfil: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kallif', genero: 'MASCULINO' },
      });
    });

    it('deve rejeitar senha inválida', async () => {
      authRepository.findUsuarioByEmail.mockResolvedValue({
        id: 'user-id',
        nome: 'Kallif',
        email: dto.email,
        senha: '$2a$10$hash_diferente',
      });

      await expect(service.login(dto)).rejects.toThrow(AppError);
    });

    it('deve rejeitar email inexistente', async () => {
      authRepository.findUsuarioByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(AppError);
    });
  });
});
