import { TarefaService } from './tarefa.service';
import { AppError } from './auth.service';
import { TipoTarefa, Categoria, ModoDistribuicao, StatusExecucao } from '../models/enums';

jest.mock('../repositories/tarefa.repository', () => ({
  tarefaRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByFamilia: jest.fn(),
    findByFamiliaWithFilters: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findGamificacaoAtiva: jest.fn(),
    findRanking: jest.fn(),
    findMembrosByFamilia: jest.fn(),
    findExecucaoById: jest.fn(),
    updateExecucao: jest.fn(),
    atualizarExecucoesAtrasadas: jest.fn(),
  },
}));

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findFamiliaById: jest.fn(),
    findMembroById: jest.fn(),
    findMembrosByFamilia: jest.fn(),
  },
}));

jest.mock('../repositories/ciclo.repository', () => ({
  cicloRepository: {
    findCicloAtivo: jest.fn(),
  },
}));

jest.mock('./notification.service', () => ({
  notificationService: {
    criar: jest.fn(),
  },
}));

const { tarefaRepository } = jest.requireMock('../repositories/tarefa.repository');
const { familyRepository } = jest.requireMock('../repositories/family.repository');
const { cicloRepository } = jest.requireMock('../repositories/ciclo.repository');

function makeTarefa(overrides = {}) {
  return {
    id: 'tarefa-id',
    familiaId: 'fam-id',
    cicloId: null,
    titulo: 'Lavar louça',
    descricao: null,
    tipo: 'FAMILIAR',
    categoria: 'CASA',
    modoDistribuicao: 'FIXA',
    responsavelAtualId: 'membro-id',
    pontos: 10,
    ativo: true,
    criadoPorId: 'criador-id',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    execucoes: [],
    ciclo: null,
    responsavelAtual: { id: 'membro-id', nome: 'Maria', fotoPerfil: null, genero: 'FEMININO' },
    criadoPor: { id: 'criador-id', nome: 'João', fotoPerfil: null },
    ...overrides,
  };
}

function makeExecucao(overrides = {}) {
  return {
    id: 'exec-id',
    tarefaId: 'tarefa-id',
    data: new Date('2026-07-01T18:00:00'),
    status: 'AGENDADA',
    pontosObtidos: null,
    concluidoPorId: null,
    concluidoEm: null,
    notificacaoCriada: false,
    tarefa: makeTarefa(),
    ...overrides,
  };
}

const service = new TarefaService();

function mockMembroResponsavel() {
  (familyRepository.findMembroById as jest.Mock).mockResolvedValue({
    id: 'membro-id',
    usuario: { id: 'usuario-id' },
  });
}

describe('TarefaService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar tarefa familiar fixa com responsável', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      tarefaRepository.create.mockResolvedValue(makeTarefa());
      mockMembroResponsavel();

      const resultado = await service.criar({
        familiaId: 'fam-id',
        titulo: 'Lavar louça',
        tipo: TipoTarefa.FAMILIAR,
        categoria: Categoria.CASA,
        modoDistribuicao: ModoDistribuicao.FIXA,
        responsavelAtualId: 'membro-id',
        criadoPorId: 'criador-id',
        pontos: 10,
      });

      expect(tarefaRepository.create).toHaveBeenCalledWith({
        familiaId: 'fam-id',
        titulo: 'Lavar louça',
        tipo: 'FAMILIAR',
        categoria: 'CASA',
        modoDistribuicao: 'FIXA',
        responsavelAtualId: 'membro-id',
        criadoPorId: 'criador-id',
        pontos: 10,
      });
      expect(resultado.titulo).toBe('Lavar louça');
    });

    it('deve criar tarefa com execuções', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      tarefaRepository.create.mockResolvedValue(makeTarefa());
      mockMembroResponsavel();

      const resultado = await service.criar({
        familiaId: 'fam-id',
        titulo: 'Lavar louça',
        tipo: TipoTarefa.FAMILIAR,
        categoria: Categoria.CASA,
        modoDistribuicao: ModoDistribuicao.FIXA,
        responsavelAtualId: 'membro-id',
        criadoPorId: 'criador-id',
        pontos: 10,
        execucoes: [
          { data: new Date('2026-07-01T18:00:00'), status: StatusExecucao.AGENDADA, pontosObtidos: null },
          { data: new Date('2026-07-02T18:00:00'), status: StatusExecucao.AGENDADA, pontosObtidos: null },
        ],
      });

      expect(tarefaRepository.create).toHaveBeenCalledWith({
        familiaId: 'fam-id',
        titulo: 'Lavar louça',
        tipo: 'FAMILIAR',
        categoria: 'CASA',
        modoDistribuicao: 'FIXA',
        responsavelAtualId: 'membro-id',
        criadoPorId: 'criador-id',
        pontos: 10,
        execucoes: [
          { data: new Date('2026-07-01T18:00:00'), status: 'AGENDADA', pontosObtidos: null },
          { data: new Date('2026-07-02T18:00:00'), status: 'AGENDADA', pontosObtidos: null },
        ],
      });
      expect(resultado.titulo).toBe('Lavar louça');
    });

    it('deve criar tarefa pessoal com responsável', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      tarefaRepository.create.mockResolvedValue(makeTarefa({ tipo: 'PESSOAL', titulo: 'Estudar inglês' }));
      mockMembroResponsavel();

      const resultado = await service.criar({
        familiaId: 'fam-id',
        titulo: 'Estudar inglês',
        tipo: TipoTarefa.PESSOAL,
        categoria: Categoria.ESTUDO,
        responsavelAtualId: 'membro-id',
        criadoPorId: 'criador-id',
        pontos: 0,
      });

      expect(resultado.titulo).toBe('Estudar inglês');
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(
        service.criar({
          familiaId: 'invalido',
          titulo: 'Teste',
          tipo: TipoTarefa.PESSOAL,
          categoria: Categoria.OUTROS,
          responsavelAtualId: 'membro-id',
          criadoPorId: 'criador-id',
        }),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa pessoal não tiver responsável', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });

      await expect(
        service.criar({
          familiaId: 'fam-id',
          titulo: 'Teste',
          tipo: TipoTarefa.PESSOAL,
          categoria: Categoria.OUTROS,
          criadoPorId: 'criador-id',
        }),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa fixa não tiver responsável', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });

      await expect(
        service.criar({
          familiaId: 'fam-id',
          titulo: 'Teste',
          tipo: TipoTarefa.FAMILIAR,
          categoria: Categoria.OUTROS,
          modoDistribuicao: ModoDistribuicao.FIXA,
          criadoPorId: 'criador-id',
        }),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa de revezamento não tiver ciclo', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });

      await expect(
        service.criar({
          familiaId: 'fam-id',
          titulo: 'Teste',
          tipo: TipoTarefa.FAMILIAR,
          categoria: Categoria.OUTROS,
          modoDistribuicao: ModoDistribuicao.REVEZAMENTO,
          criadoPorId: 'criador-id',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('listar', () => {
    it('deve listar tarefas com paginação e filtros', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);

      const resultado = await service.listar('fam-id', {
        filtro: { tipo: 'FAMILIAR' },
        ordenacao: [{ coluna: 'titulo', direcao: 'asc' }],
        pagina: 1,
        porPagina: 10,
        paginaResposta: 1,
        porPaginaResposta: 10,
      });

      expect(tarefaRepository.atualizarExecucoesAtrasadas).toHaveBeenCalledWith('fam-id');
      expect(tarefaRepository.findByFamiliaWithFilters).toHaveBeenCalledWith('fam-id', {
        filtro: { tipo: 'FAMILIAR', cicloId: 'null' },
        ordenacao: [{ coluna: 'titulo', direcao: 'asc' }],
        pagina: 1,
        porPagina: 10,
      });
      expect(resultado.paginacao.total).toBe(1);
      expect(resultado.paginacao.pagina).toBe(1);
      expect(resultado.paginacao.por_pagina).toBe(10);
      expect(resultado.paginacao.ultima_pagina).toBe(1);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.filtro).toEqual({ tipo: 'FAMILIAR', cicloId: 'null' });
    });

    it('deve usar padrões quando nenhum filtro fornecido', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);

      const resultado = await service.listar('fam-id', {
        pagina: 1,
        porPagina: 10,
        paginaResposta: 1,
        porPaginaResposta: 10,
      });

      expect(resultado.filtro).toEqual({ cicloId: 'null' });
      expect(resultado.ordenacao).toEqual([{ coluna: 'criadoEm', direcao: 'desc' }]);
    });

    it('deve filtrar tarefas por dependente', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);
      familyRepository.findMembrosByFamilia.mockResolvedValue([
        { id: 'm1', dependente: false },
        { id: 'm2', dependente: true },
        { id: 'm3', dependente: true },
      ]);

      const resultado = await service.listar('fam-id', {
        filtro: { dependente: 'true' },
        pagina: 1,
        porPagina: 10,
        paginaResposta: 1,
        porPaginaResposta: 10,
      });

      expect(tarefaRepository.findByFamiliaWithFilters).toHaveBeenCalledWith('fam-id', {
        filtro: { responsavelAtualId: ['m2', 'm3'], cicloId: 'null' },
        ordenacao: undefined,
        pagina: 1,
        porPagina: 10,
      });
      expect(resultado.filtro).toEqual({ responsavelAtualId: ['m2', 'm3'], cicloId: 'null' });
    });

    it('deve filtrar tarefas por nao dependente', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);
      familyRepository.findMembrosByFamilia.mockResolvedValue([
        { id: 'm1', dependente: false },
        { id: 'm2', dependente: true },
      ]);

      const resultado = await service.listar('fam-id', {
        filtro: { dependente: 'false' },
        pagina: 1,
        porPagina: 10,
        paginaResposta: 1,
        porPaginaResposta: 10,
      });

      expect(tarefaRepository.findByFamiliaWithFilters).toHaveBeenCalledWith('fam-id', {
        filtro: { responsavelAtualId: 'm1', cicloId: 'null' },
        ordenacao: undefined,
        pagina: 1,
        porPagina: 10,
      });
    });

    it('deve lancar erro se familia nao existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(
        service.listar('invalido', { pagina: 1, porPagina: 10, paginaResposta: 1, porPaginaResposta: 10 }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('obter', () => {
    it('deve retornar tarefa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa());

      const resultado = await service.obter('fam-id', 'tarefa-id');

      expect(resultado.id).toBe('tarefa-id');
    });

    it('deve lançar erro se tarefa não pertencer à família', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ familiaId: 'outra-fam' }));

      await expect(service.obter('fam-id', 'tarefa-id')).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa não existir', async () => {
      tarefaRepository.findById.mockResolvedValue(null);

      await expect(service.obter('fam-id', 'tarefa-id')).rejects.toThrow(AppError);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar tarefa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa());
      tarefaRepository.update.mockResolvedValue(makeTarefa({ titulo: 'Novo título' }));

      const resultado = await service.atualizar('fam-id', 'tarefa-id', { titulo: 'Novo título' });

      expect(tarefaRepository.update).toHaveBeenCalledWith('tarefa-id', { titulo: 'Novo título' });
      expect(resultado.titulo).toBe('Novo título');
    });

    it('deve lançar erro se tarefa não existir', async () => {
      tarefaRepository.findById.mockResolvedValue(null);

      await expect(service.atualizar('fam-id', 'tarefa-id', {})).rejects.toThrow(AppError);
    });
  });

  describe('remover', () => {
    it('deve remover tarefa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa());

      const resultado = await service.remover('fam-id', 'tarefa-id');

      expect(tarefaRepository.delete).toHaveBeenCalledWith('tarefa-id');
      expect(resultado.message).toBe('Tarefa removida com sucesso');
    });

    it('deve lançar erro se tarefa não existir', async () => {
      tarefaRepository.findById.mockResolvedValue(null);

      await expect(service.remover('fam-id', 'tarefa-id')).rejects.toThrow(AppError);
    });
  });

  describe('concluir', () => {
    it('deve concluir execução e gerar pontos com gamificação ativa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ tipo: 'FAMILIAR', pontos: 10 }));
      tarefaRepository.findExecucaoById.mockResolvedValue(makeExecucao());
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue({ id: 'gam-id', ativo: true });

      const resultado = await service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id');

      expect(tarefaRepository.updateExecucao).toHaveBeenCalledWith('exec-id', {
        status: 'CONCLUIDA',
        pontosObtidos: 10,
        concluidoPorId: 'membro-id',
        concluidoEm: expect.any(Date),
      });
      expect(resultado.pontosGerados).toBe(10);
    });

    it('deve concluir execução pessoal sem gerar pontos', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ tipo: 'PESSOAL', pontos: 10 }));
      tarefaRepository.findExecucaoById.mockResolvedValue(makeExecucao());
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue({ id: 'gam-id', ativo: true });

      const resultado = await service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id');

      expect(tarefaRepository.updateExecucao).toHaveBeenCalledWith('exec-id', {
        status: 'CONCLUIDA',
        pontosObtidos: 0,
        concluidoPorId: 'membro-id',
        concluidoEm: expect.any(Date),
      });
      expect(resultado.pontosGerados).toBe(0);
    });

    it('deve concluir execução sem gerar pontos sem gamificação', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ pontos: 10 }));
      tarefaRepository.findExecucaoById.mockResolvedValue(makeExecucao());
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue(null);

      const resultado = await service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id');

      expect(tarefaRepository.updateExecucao).toHaveBeenCalledWith('exec-id', {
        status: 'CONCLUIDA',
        pontosObtidos: 0,
        concluidoPorId: 'membro-id',
        concluidoEm: expect.any(Date),
      });
      expect(resultado.pontosGerados).toBe(0);
    });

    it('deve lançar erro se execução não existir', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa());
      tarefaRepository.findExecucaoById.mockResolvedValue(null);

      await expect(
        service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id'),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se execução já estiver concluída', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa());
      tarefaRepository.findExecucaoById.mockResolvedValue(makeExecucao({ status: 'CONCLUIDA' }));

      await expect(
        service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id'),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa estiver inativa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ ativo: false }));

      await expect(
        service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id'),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa não existir', async () => {
      tarefaRepository.findById.mockResolvedValue(null);

      await expect(
        service.concluir('fam-id', 'tarefa-id', 'exec-id', 'membro-id'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('atualizarExecucoesAtrasadas', () => {
    it('deve atualizar execuções atrasadas', async () => {
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 3 });

      const resultado = await service.atualizarExecucoesAtrasadas('fam-id');

      expect(tarefaRepository.atualizarExecucoesAtrasadas).toHaveBeenCalledWith('fam-id');
      expect(resultado).toEqual({ count: 3 });
    });
  });

  describe('ranking', () => {
    it('deve retornar ranking ordenado por pontos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.findRanking.mockResolvedValue([
        { concluidoPorId: 'm1', _sum: { pontosObtidos: 30 } },
        { concluidoPorId: 'm2', _sum: { pontosObtidos: 10 } },
      ]);
      tarefaRepository.findMembrosByFamilia.mockResolvedValue([
        { id: 'm1', nome: 'Maria', fotoPerfil: null },
        { id: 'm2', nome: 'João', fotoPerfil: '/foto.jpg' },
      ]);

      const resultado = await service.ranking('fam-id');

      expect(resultado).toHaveLength(2);
      expect(resultado[0].membroId).toBe('m1');
      expect(resultado[0].pontos).toBe(30);
      expect(resultado[1].membroId).toBe('m2');
      expect(resultado[1].pontos).toBe(10);
    });

    it('deve lançar erro se família não existir', async () => {
      familyRepository.findFamiliaById.mockResolvedValue(null);

      await expect(service.ranking('invalido')).rejects.toThrow(AppError);
    });
  });
});
