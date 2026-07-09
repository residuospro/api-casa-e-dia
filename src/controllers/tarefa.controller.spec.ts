import request from 'supertest';
import express from 'express';
import cors from 'cors';
import tarefaRoutes from '../routes/tarefa.routes';
import { errorMiddleware } from '../middlewares/error.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

jest.mock('../middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.usuario = { id: 'user-id', nome: 'Teste', email: 'teste@email.com', fotoPerfil: null, genero: null, primeiroAcesso: false };
    next();
  }),
}));

jest.mock('../services/notification.service', () => ({
  notificationService: {
    criar: jest.fn(),
  },
}));

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findFamiliaById: jest.fn(),
    findMembroByUsuarioAndFamilia: jest.fn(),
    findMembrosByFamilia: jest.fn(),
    findMembroById: jest.fn(),
  },
}));

jest.mock('../repositories/ciclo.repository', () => ({
  cicloRepository: {
    findCicloAtivo: jest.fn(),
  },
}));

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

const { familyRepository } = jest.requireMock('../repositories/family.repository');
const { tarefaRepository } = jest.requireMock('../repositories/tarefa.repository');
const { cicloRepository } = jest.requireMock('../repositories/ciclo.repository');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/families', tarefaRoutes);
app.use(errorMiddleware);

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
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    execucoes: [
      { id: 'exec-id', data: new Date().toISOString(), status: 'AGENDADA', pontosObtidos: null, concluidoPorId: null, concluidoEm: null, notificacaoCriada: false },
    ],
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
    data: new Date().toISOString(),
    status: 'AGENDADA',
    pontosObtidos: null,
    concluidoPorId: null,
    concluidoEm: null,
    notificacaoCriada: false,
    tarefa: makeTarefa(),
    ...overrides,
  };
}

describe('TarefaController (integração)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /families/:familiaId/tarefas', () => {
    it('deve criar tarefa com dados válidos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ id: 'criador-id' });
      familyRepository.findMembroById.mockResolvedValue({ id: 'membro-id', usuario: { id: 'usuario-id' } });
      tarefaRepository.create.mockResolvedValue(makeTarefa());

      const response = await request(app)
        .post('/families/fam-id/tarefas')
        .send({
          titulo: 'Lavar louça',
          tipo: 'FAMILIAR',
          categoria: 'CASA',
          modoDistribuicao: 'FIXA',
          responsavelAtualId: 'membro-id',
        });

      expect(response.status).toBe(201);
      expect(response.body.titulo).toBe('Lavar louça');
    });

    it('deve retornar 400 com dados inválidos', async () => {
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ id: 'criador-id' });

      const response = await request(app)
        .post('/families/fam-id/tarefas')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /families/:familiaId/tarefas', () => {
    it('deve listar tarefas com paginação', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);

      const response = await request(app).get('/families/fam-id/tarefas');

      expect(response.status).toBe(200);
      expect(response.body.paginacao.total).toBe(1);
      expect(response.body.paginacao.pagina).toBe(1);
      expect(response.body.paginacao.por_pagina).toBe(10);
      expect(response.body.paginacao.ultima_pagina).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.filtro).toBeDefined();
      expect(response.body.ordenacao).toBeDefined();
    });

    it('deve aceitar filtros via query params', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [makeTarefa()],
        total: 1,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);

      const response = await request(app)
        .get('/families/fam-id/tarefas')
        .query({ 'filtro[tipo]': 'FAMILIAR', pagina: '2', por_pagina: '5' });

      expect(response.status).toBe(200);
      expect(response.body.paginacao.pagina).toBe(2);
      expect(response.body.paginacao.por_pagina).toBe(5);
    });

    it('deve aplicar limites na paginação', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.atualizarExecucoesAtrasadas.mockResolvedValue({ count: 0 });
      tarefaRepository.findByFamiliaWithFilters.mockResolvedValue({
        data: [],
        total: 0,
      });
      cicloRepository.findCicloAtivo.mockResolvedValue(null);

      const response = await request(app)
        .get('/families/fam-id/tarefas')
        .query({ pagina: '-1', por_pagina: '999' });

      expect(response.status).toBe(200);
      expect(response.body.paginacao.pagina).toBe(-1);
      expect(response.body.paginacao.por_pagina).toBe(999);
    });
  });

  describe('POST /families/:familiaId/tarefas/:id/concluir', () => {
    it('deve concluir execução', async () => {
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ id: 'membro-id' });
      tarefaRepository.findById.mockResolvedValue(makeTarefa());
      tarefaRepository.findExecucaoById.mockResolvedValue(makeExecucao());
      tarefaRepository.findGamificacaoAtiva.mockResolvedValue(null);

      const response = await request(app)
        .post('/families/fam-id/tarefas/tarefa-id/concluir')
        .send({ execucaoId: 'exec-id' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tarefa concluída com sucesso');
    });

    it('deve retornar 400 sem execucaoId', async () => {
      familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({ id: 'membro-id' });
      tarefaRepository.findById.mockResolvedValue(makeTarefa());

      const response = await request(app)
        .post('/families/fam-id/tarefas/tarefa-id/concluir')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /families/:familiaId/ranking', () => {
    it('deve retornar ranking', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      tarefaRepository.findRanking.mockResolvedValue([
        { concluidoPorId: 'm1', _sum: { pontosObtidos: 30 } },
      ]);
      tarefaRepository.findMembrosByFamilia.mockResolvedValue([
        { id: 'm1', nome: 'Maria', fotoPerfil: null },
      ]);

      const response = await request(app).get('/families/fam-id/ranking');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].pontos).toBe(30);
    });
  });
});
