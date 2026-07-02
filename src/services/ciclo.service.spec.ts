import { CicloService } from './ciclo.service';
import { AppError } from './auth.service';

jest.mock('../repositories/ciclo.repository', () => ({
  cicloRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findCicloAtivo: jest.fn(),
    findCiclosAtivos: jest.fn(),
    findByFamilia: jest.fn(),
    findCiclosVencidos: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findFamiliaById: jest.fn(),
    findMembrosAtivosByFamilia: jest.fn(),
  },
}));

jest.mock('../repositories/tarefa.repository', () => ({
  tarefaRepository: {
    findRevezamentoByCiclo: jest.fn(),
    updateResponsavel: jest.fn(),
  },
}));

jest.mock('../repositories/notification.repository', () => ({
  notificationRepository: {
    findCicloNotificationExists: jest.fn(),
  },
}));

jest.mock('./notification.service', () => ({
  notificationService: {
    criar: jest.fn(),
  },
}));

const { cicloRepository } = jest.requireMock('../repositories/ciclo.repository');
const { familyRepository } = jest.requireMock('../repositories/family.repository');
const { tarefaRepository } = jest.requireMock('../repositories/tarefa.repository');
const { notificationRepository } = jest.requireMock('../repositories/notification.repository');
const { notificationService } = jest.requireMock('./notification.service');

function makeCiclo(overrides = {}) {
  const data = new Date();
  data.setDate(data.getDate() - 10);
  return {
    id: 'ciclo-id',
    familiaId: 'fam-id',
    nome: 'Ciclo Semanal',
    descricao: null,
    duracaoDias: 7,
    ativo: true,
    inicio: data,
    ultimaRotacao: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

const service = new CicloService();

describe('CicloService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar um ciclo ativo quando não há outro ativo', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);
      cicloRepository.create.mockResolvedValue(makeCiclo({ ativo: true }));

      const resultado = await service.criar({
        familiaId: 'fam-id',
        nome: 'Ciclo Semanal',
        duracaoDias: 7,
      });

      expect(cicloRepository.create).toHaveBeenCalledWith({
        familiaId: 'fam-id',
        nome: 'Ciclo Semanal',
        duracaoDias: 7,
        ativo: true,
      });
      expect(resultado.ativo).toBe(true);
    });

    it('deve criar ciclo com ativo false se já existir outro ativo', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      cicloRepository.findCicloAtivo.mockResolvedValue({ id: 'outro-ciclo', nome: 'Ativo' });
      cicloRepository.create.mockResolvedValue(makeCiclo({ ativo: false }));

      const resultado = await service.criar({
        familiaId: 'fam-id',
        nome: 'Novo Ciclo',
        duracaoDias: 7,
      });

      expect(cicloRepository.create).toHaveBeenCalledWith({
        familiaId: 'fam-id',
        nome: 'Novo Ciclo',
        duracaoDias: 7,
        ativo: false,
      });
      expect(resultado.ativo).toBe(false);
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(
        service.criar({ familiaId: 'invalido', nome: 'Ciclo', duracaoDias: 7 }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('listar', () => {
    it('deve listar ciclos da família', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      cicloRepository.findByFamilia.mockResolvedValue([makeCiclo()]);

      const resultado = await service.listar('fam-id');

      expect(cicloRepository.findByFamilia).toHaveBeenCalledWith('fam-id');
      expect(resultado).toHaveLength(1);
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(service.listar('invalido')).rejects.toThrow(AppError);
    });
  });

  describe('obter', () => {
    it('deve retornar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());

      const resultado = await service.obter('fam-id', 'ciclo-id');

      expect(resultado.id).toBe('ciclo-id');
    });

    it('deve lançar erro se ciclo não pertencer à família', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ familiaId: 'outra-fam' }));

      await expect(service.obter('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });

    it('deve lançar erro se ciclo não existir', async () => {
      cicloRepository.findById.mockResolvedValue(null);

      await expect(service.obter('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      cicloRepository.findCicloAtivo.mockResolvedValue(null);
      cicloRepository.update.mockResolvedValue(makeCiclo({ nome: 'Novo Ciclo', duracaoDias: 14 }));

      const resultado = await service.atualizar('fam-id', 'ciclo-id', { nome: 'Novo Ciclo', duracaoDias: 14 });

      expect(cicloRepository.update).toHaveBeenCalledWith('ciclo-id', { nome: 'Novo Ciclo', duracaoDias: 14 });
      expect(resultado.nome).toBe('Novo Ciclo');
    });

    it('deve permitir ativar ciclo se não houver outro ativo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: false }));
      cicloRepository.findCicloAtivo.mockResolvedValue(null);
      cicloRepository.update.mockResolvedValue(makeCiclo({ ativo: true }));

      const resultado = await service.atualizar('fam-id', 'ciclo-id', { ativo: true });

      expect(cicloRepository.update).toHaveBeenCalledWith('ciclo-id', { ativo: true });
      expect(resultado.ativo).toBe(true);
    });

    it('deve lançar erro se tentar ativar quando outro ciclo já está ativo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: false }));
      cicloRepository.findCicloAtivo.mockResolvedValue({ id: 'outro-ativo', nome: 'Outro' });

      await expect(
        service.atualizar('fam-id', 'ciclo-id', { ativo: true }),
      ).rejects.toThrow(AppError);
    });

    it('não deve bloquear se o ativo for o mesmo ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ id: 'ciclo-id', ativo: true }));
      cicloRepository.findCicloAtivo.mockResolvedValue({ id: 'ciclo-id', ativo: true });
      cicloRepository.update.mockResolvedValue(makeCiclo({ ativo: true }));

      const resultado = await service.atualizar('fam-id', 'ciclo-id', { ativo: true });

      expect(resultado.ativo).toBe(true);
    });

    it('deve atualizar inicio do ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      const novaData = '2026-07-01T00:00:00.000Z';
      cicloRepository.update.mockResolvedValue(makeCiclo({ inicio: new Date(novaData) }));

      const resultado = await service.atualizar('fam-id', 'ciclo-id', { inicio: novaData });

      expect(cicloRepository.update).toHaveBeenCalledWith('ciclo-id', { inicio: new Date(novaData) });
      expect(resultado.inicio).toEqual(new Date(novaData));
    });

    it('deve lançar erro se ciclo não existir', async () => {
      cicloRepository.findById.mockResolvedValue(null);

      await expect(service.atualizar('fam-id', 'ciclo-id', {})).rejects.toThrow(AppError);
    });
  });

  describe('remover', () => {
    it('deve remover ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());

      const resultado = await service.remover('fam-id', 'ciclo-id');

      expect(cicloRepository.delete).toHaveBeenCalledWith('ciclo-id');
      expect(resultado.message).toBe('Ciclo removido com sucesso');
    });

    it('deve lançar erro se ciclo não existir', async () => {
      cicloRepository.findById.mockResolvedValue(null);

      await expect(service.remover('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });
  });

  describe('rotacionar', () => {
    it('deve rotacionar tarefas em round-robin', async () => {
      const ciclo = makeCiclo();
      cicloRepository.findById.mockResolvedValue(ciclo);
      tarefaRepository.findRevezamentoByCiclo.mockResolvedValue([
        { id: 't1', titulo: 'Lavar louça', responsavelAtualId: 'm1' },
        { id: 't2', titulo: 'Varrer', responsavelAtualId: 'm2' },
        { id: 't3', titulo: 'Cuidar plantas', responsavelAtualId: 'm1' },
      ]);
      familyRepository.findMembrosAtivosByFamilia.mockResolvedValue([
        { id: 'm1', nome: 'Maria' },
        { id: 'm2', nome: 'João' },
      ]);
      tarefaRepository.updateResponsavel
        .mockResolvedValueOnce({ id: 't1', titulo: 'Lavar louça', responsavelAtualId: 'm1' })
        .mockResolvedValueOnce({ id: 't2', titulo: 'Varrer', responsavelAtualId: 'm2' })
        .mockResolvedValueOnce({ id: 't3', titulo: 'Cuidar plantas', responsavelAtualId: 'm1' });
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ultimaRotacao: new Date() }));

      const resultado = await service.rotacionar('fam-id', 'ciclo-id');

      expect(tarefaRepository.updateResponsavel).toHaveBeenCalledTimes(3);
      expect(tarefaRepository.updateResponsavel).toHaveBeenNthCalledWith(1, 't1', 'm1');
      expect(tarefaRepository.updateResponsavel).toHaveBeenNthCalledWith(2, 't2', 'm2');
      expect(tarefaRepository.updateResponsavel).toHaveBeenNthCalledWith(3, 't3', 'm1');
      expect(resultado.message).toBe('Tarefas rotacionadas com sucesso');
      expect(resultado.tarefas).toHaveLength(3);
    });

    it('deve lançar erro se ciclo não existir', async () => {
      cicloRepository.findById.mockResolvedValue(null);

      await expect(service.rotacionar('fam-id', 'invalido')).rejects.toThrow(AppError);
    });

    it('deve lançar erro se ciclo estiver inativo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: false }));

      await expect(service.rotacionar('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });

    it('deve lançar erro se ciclo ainda não venceu', async () => {
      const dataRecente = new Date();
      dataRecente.setDate(dataRecente.getDate() - 1);
      cicloRepository.findById.mockResolvedValue(makeCiclo({ inicio: dataRecente, duracaoDias: 7 }));

      await expect(service.rotacionar('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });

    it('deve lançar erro se não houver tarefas de revezamento', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      tarefaRepository.findRevezamentoByCiclo.mockResolvedValue([]);

      await expect(service.rotacionar('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });

    it('deve lançar erro se não houver membros ativos', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      tarefaRepository.findRevezamentoByCiclo.mockResolvedValue([
        { id: 't1', titulo: 'Lavar', responsavelAtualId: 'm1' },
      ]);
      familyRepository.findMembrosAtivosByFamilia.mockResolvedValue([]);

      await expect(service.rotacionar('fam-id', 'ciclo-id')).rejects.toThrow(AppError);
    });
  });

  describe('listarAtivos', () => {
  it('deve retornar ciclos ativos no formato text/value', async () => {
    familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
    cicloRepository.findCiclosAtivos.mockResolvedValue([
      { id: 'c1', nome: 'Ciclo A' },
      { id: 'c2', nome: 'Ciclo B' },
    ]);

    const resultado = await service.listarAtivos('fam-id');

    expect(resultado).toEqual([
      { text: 'Ciclo A', value: 'c1' },
      { text: 'Ciclo B', value: 'c2' },
    ]);
  });

  it('deve lançar erro se família não existir', async () => {
    familyRepository.findFamiliaById.mockResolvedValue(null);

    await expect(service.listarAtivos('invalido')).rejects.toThrow(AppError);
  });
});

describe('alterarAtivo', () => {
    it('deve ativar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: false }));
      cicloRepository.findCicloAtivo.mockResolvedValue(null);
      cicloRepository.update.mockResolvedValue(makeCiclo({ ativo: true }));

      const resultado = await service.alterarAtivo('fam-id', 'ciclo-id', true);

      expect(cicloRepository.update).toHaveBeenCalledWith('ciclo-id', { ativo: true });
      expect(resultado.ativo).toBe(true);
    });

    it('deve desativar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: true }));
      cicloRepository.update.mockResolvedValue(makeCiclo({ ativo: false }));

      const resultado = await service.alterarAtivo('fam-id', 'ciclo-id', false);

      expect(cicloRepository.update).toHaveBeenCalledWith('ciclo-id', { ativo: false });
      expect(resultado.ativo).toBe(false);
    });

    it('deve lançar erro se ativar e já existir outro ativo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: false }));
      cicloRepository.findCicloAtivo.mockResolvedValue({ id: 'outro-ativo', nome: 'Outro' });

      await expect(service.alterarAtivo('fam-id', 'ciclo-id', true)).rejects.toThrow(AppError);
    });

    it('deve lançar erro se ciclo não existir', async () => {
      cicloRepository.findById.mockResolvedValue(null);

      await expect(service.alterarAtivo('fam-id', 'invalido', true)).rejects.toThrow(AppError);
    });
  });

  describe('verificarCiclos', () => {
    it('deve retornar ciclos vencidos e criar notificações', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      const cicloVencido = makeCiclo();
      cicloRepository.findCiclosVencidos.mockResolvedValue([cicloVencido]);
      familyRepository.findMembrosAtivosByFamilia.mockResolvedValue([
        { id: 'm1', usuarioId: 'u1', nome: 'Maria' },
        { id: 'm2', usuarioId: 'u2', nome: 'João' },
      ]);
      notificationRepository.findCicloNotificationExists.mockResolvedValue(null);

      const resultado = await service.verificarCiclos('fam-id');

      expect(cicloRepository.findCiclosVencidos).toHaveBeenCalledWith('fam-id');
      expect(notificationService.criar).toHaveBeenCalledTimes(2);
      expect(resultado.ciclosVencidos).toHaveLength(1);
    });

    it('não deve criar notificação se já existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      cicloRepository.findCiclosVencidos.mockResolvedValue([makeCiclo()]);
      familyRepository.findMembrosAtivosByFamilia.mockResolvedValue([
        { id: 'm1', usuarioId: 'u1', nome: 'Maria' },
      ]);
      notificationRepository.findCicloNotificationExists.mockResolvedValue({ id: 'notif-existente' });

      const resultado = await service.verificarCiclos('fam-id');

      expect(notificationService.criar).not.toHaveBeenCalled();
      expect(resultado.ciclosVencidos).toHaveLength(1);
    });

    it('deve retornar lista vazia se não houver ciclos vencidos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      cicloRepository.findCiclosVencidos.mockResolvedValue([]);

      const resultado = await service.verificarCiclos('fam-id');

      expect(resultado.ciclosVencidos).toHaveLength(0);
      expect(notificationService.criar).not.toHaveBeenCalled();
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(service.verificarCiclos('invalido')).rejects.toThrow(AppError);
    });
  });
});
