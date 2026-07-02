import { TarefaService } from './tarefa.service';
import { AppError } from './auth.service';
import { TipoTarefa, Categoria, ModoDistribuicao } from '../models/enums';

jest.mock('../repositories/tarefa.repository', () => ({
  tarefaRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByFamilia: jest.fn(),
    findByFamiliaWithFilters: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createExecucao: jest.fn(),
    findGamificacaoAtiva: jest.fn(),
    findRanking: jest.fn(),
    findMembrosByFamilia: jest.fn(),
  },
}));

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findFamiliaById: jest.fn(),
  },
}));

const { tarefaRepository } = jest.requireMock('../repositories/tarefa.repository');
const { familyRepository } = jest.requireMock('../repositories/family.repository');

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
    agendamentos: [],
    ciclo: null,
    responsavelAtual: { id: 'membro-id', nome: 'Maria', fotoPerfil: null, genero: 'FEMININO' },
    criadoPor: { id: 'criador-id', nome: 'João', fotoPerfil: null },
    ...overrides,
  };
}

const service = new TarefaService();

describe('TarefaService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar tarefa familiar fixa com responsável', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      tarefaRepository.create.mockResolvedValue(makeTarefa());

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

    it('deve criar tarefa pessoal com responsável', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      tarefaRepository.create.mockResolvedValue(makeTarefa({ tipo: 'PESSOAL', titulo: 'Estudar inglês' }));

      const resultado = await service.criar({
        familiaId: 'fam-id',
        titulo: 'Estudar inglês',
        tipo: TipoTarefa.PESSOAL,
        categoria: Categoria.ESTUDO,
        responsavelAtualId: 'membro-id',
        criadoPorId: 'criador-id',
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
  });

  describe('listar', () => {
    it('deve listar tarefas com paginação e filtros', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });

      const resultado = await service.listar('fam-id', {
        filtro: { tipo: 'FAMILIAR' },
        ordenacao: [{ coluna: 'titulo', direcao: 'asc' }],
        pagina: 1,
        porPagina: 10,
        paginaResposta: 1,
        porPaginaResposta: 10,
      });

      expect(tarefaRepository.findByFamiliaWithFilters).toHaveBeenCalledWith('fam-id', {
        filtro: { tipo: 'FAMILIAR' },
        ordenacao: [{ coluna: 'titulo', direcao: 'asc' }],
        pagina: 1,
        porPagina: 10,
      });
      expect(resultado.paginacao.total).toBe(1);
      expect(resultado.paginacao.pagina).toBe(1);
      expect(resultado.paginacao.por_pagina).toBe(10);
      expect(resultado.paginacao.ultima_pagina).toBe(1);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.filtro).toEqual({ tipo: 'FAMILIAR' });
    });

    it('deve usar padrões quando nenhum filtro fornecido', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });

      const resultado = await service.listar('fam-id', {
        pagina: 1,
        porPagina: 10,
        paginaResposta: 1,
        porPaginaResposta: 10,
      });

      expect(resultado.filtro).toEqual({});
      expect(resultado.ordenacao).toEqual([{ coluna: 'criadoEm', direcao: 'desc' }]);
    });

    it('deve lançar erro se família não existir', async () => {
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
    it('deve concluir tarefa e gerar pontos com gamificação ativa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ tipo: 'FAMILIAR', pontos: 10 }));
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue({ id: 'gam-id', ativo: true });

      const resultado = await service.concluir('fam-id', 'tarefa-id', 'membro-id');

      expect(tarefaRepository.createExecucao).toHaveBeenCalledWith({
        tarefaId: 'tarefa-id',
        membroId: 'membro-id',
        dataExecucao: expect.any(Date),
        observacao: undefined,
        pontosGerados: 10,
      });
      expect(resultado.pontosGerados).toBe(10);
    });

    it('deve concluir tarefa pessoal sem gerar pontos mesmo com gamificação ativa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ tipo: 'PESSOAL', pontos: 10 }));
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue({ id: 'gam-id', ativo: true });

      const resultado = await service.concluir('fam-id', 'tarefa-id', 'membro-id');

      expect(tarefaRepository.createExecucao).toHaveBeenCalledWith({
        tarefaId: 'tarefa-id',
        membroId: 'membro-id',
        dataExecucao: expect.any(Date),
        observacao: undefined,
        pontosGerados: 0,
      });
      expect(resultado.pontosGerados).toBe(0);
    });

    it('deve concluir tarefa sem gerar pontos sem gamificação', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ pontos: 10 }));
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue(null);

      const resultado = await service.concluir('fam-id', 'tarefa-id', 'membro-id', 'Feito!');

      expect(tarefaRepository.createExecucao).toHaveBeenCalledWith({
        tarefaId: 'tarefa-id',
        membroId: 'membro-id',
        dataExecucao: expect.any(Date),
        observacao: 'Feito!',
        pontosGerados: 0,
      });
      expect(resultado.pontosGerados).toBe(0);
    });

    it('deve lançar erro se tarefa estiver inativa', async () => {
      tarefaRepository.findById.mockResolvedValue(makeTarefa({ ativo: false }));

      await expect(
        service.concluir('fam-id', 'tarefa-id', 'membro-id'),
      ).rejects.toThrow(AppError);
    });

    it('deve lançar erro se tarefa não existir', async () => {
      tarefaRepository.findById.mockResolvedValue(null);

      await expect(
        service.concluir('fam-id', 'tarefa-id', 'membro-id'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('ranking', () => {
    it('deve retornar ranking ordenado por pontos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.findRanking.mockResolvedValue([
        { membroId: 'm1', _sum: { pontosGerados: 30 } },
        { membroId: 'm2', _sum: { pontosGerados: 10 } },
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
