import request from 'supertest';
import express from 'express';
import cors from 'cors';
import cicloRoutes from '../routes/ciclo.routes';
import { errorMiddleware } from '../middlewares/error.middleware';

jest.mock('../middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.usuario = {
      id: 'user-id',
      nome: 'Teste',
      email: 'teste@email.com',
      fotoPerfil: null,
      genero: null,
      primeiroAcesso: false,
    };
    next();
  }),
}));

jest.mock('../repositories/family.repository', () => ({
  familyRepository: {
    findFamiliaById: jest.fn(),
    findMembrosAtivosByFamilia: jest.fn(),
    findMembrosByIds: jest.fn(),
  },
}));

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

jest.mock('../repositories/tarefa.repository', () => ({
  tarefaRepository: {
    findRevezamentoByCiclo: jest.fn(),
    updateResponsavel: jest.fn(),
    findExecucoesByTarefa: jest.fn(),
    createExecucoes: jest.fn(),
  },
}));

jest.mock('../repositories/notification.repository', () => ({
  notificationRepository: {
    findCicloNotificationExists: jest.fn(),
  },
}));

jest.mock('../services/notification.service', () => ({
  notificationService: {
    criar: jest.fn(),
  },
}));

const { familyRepository } = jest.requireMock('../repositories/family.repository');
const { cicloRepository } = jest.requireMock('../repositories/ciclo.repository');
const { tarefaRepository } = jest.requireMock('../repositories/tarefa.repository');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/families', cicloRoutes);
app.use(errorMiddleware);

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
    proximaRenovacao: null,
    participantes: [],
    renovacaoAutomatica: false,
    revezamentoAutomatico: false,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

describe('CicloController (integração)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /families/:familiaId/ciclos', () => {
    it('deve criar ciclo com dados válidos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id', nome: 'Família Teste' });
      cicloRepository.create.mockResolvedValue(makeCiclo());

      const response = await request(app)
        .post('/families/fam-id/ciclos')
        .send({ nome: 'Ciclo Semanal', duracaoDias: 7 });

      expect(response.status).toBe(201);
      expect(response.body.nome).toBe('Ciclo Semanal');
    });

    it('deve retornar 400 com dados inválidos', async () => {
      const response = await request(app).post('/families/fam-id/ciclos').send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /families/:familiaId/ciclos', () => {
    it('deve listar ciclos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      cicloRepository.findByFamilia.mockResolvedValue([makeCiclo()]);

      const response = await request(app).get('/families/fam-id/ciclos');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /families/:familiaId/ciclos/:id', () => {
    it('deve obter ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());

      const response = await request(app).get('/families/fam-id/ciclos/ciclo-id');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('ciclo-id');
    });

    it('deve retornar 404 se ciclo não existir', async () => {
      cicloRepository.findById.mockResolvedValue(null);

      const response = await request(app).get('/families/fam-id/ciclos/invalido');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /families/:familiaId/ciclos/:id', () => {
    it('deve atualizar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      cicloRepository.update.mockResolvedValue(makeCiclo({ nome: 'Novo Ciclo', duracaoDias: 14 }));

      const response = await request(app)
        .put('/families/fam-id/ciclos/ciclo-id')
        .send({ nome: 'Novo Ciclo', duracaoDias: 14 });

      expect(response.status).toBe(200);
      expect(response.body.nome).toBe('Novo Ciclo');
    });

    it('deve atualizar inicio do ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      cicloRepository.update.mockResolvedValue(
        makeCiclo({ inicio: new Date('2026-07-13T00:00:00') }),
      );

      const response = await request(app)
        .put('/families/fam-id/ciclos/ciclo-id')
        .send({ inicio: '2026-07-13' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /families/:familiaId/ciclos/:id', () => {
    it('deve remover ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo());
      cicloRepository.delete.mockResolvedValue(makeCiclo());

      const response = await request(app).delete('/families/fam-id/ciclos/ciclo-id');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Ciclo removido com sucesso');
    });
  });

  describe('GET /families/:familiaId/ciclos/ativos', () => {
    it('deve retornar ciclos ativos no formato text/value', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      cicloRepository.findCiclosAtivos.mockResolvedValue([
        { id: 'c1', nome: 'Ciclo A', inicio: new Date(), duracaoDias: 7, proximaRenovacao: null },
        { id: 'c2', nome: 'Ciclo B', inicio: new Date(), duracaoDias: 14, proximaRenovacao: null },
      ]);

      const response = await request(app).get('/families/fam-id/ciclos/ativos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { text: 'Ciclo A', value: 'c1' },
        { text: 'Ciclo B', value: 'c2' },
      ]);
    });
  });

  describe('PATCH /families/:familiaId/ciclos/:id/ativo', () => {
    it('deve ativar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: false }));
      cicloRepository.update.mockResolvedValue(makeCiclo({ ativo: true }));

      const response = await request(app)
        .patch('/families/fam-id/ciclos/ciclo-id/ativo')
        .send({ ativo: true });

      expect(response.status).toBe(200);
      expect(response.body.ativo).toBe(true);
    });

    it('deve desativar ciclo', async () => {
      cicloRepository.findById.mockResolvedValue(makeCiclo({ ativo: true }));
      cicloRepository.update.mockResolvedValue(makeCiclo({ ativo: false }));

      const response = await request(app)
        .patch('/families/fam-id/ciclos/ciclo-id/ativo')
        .send({ ativo: false });

      expect(response.status).toBe(200);
      expect(response.body.ativo).toBe(false);
    });

    it('deve retornar 400 se ativo não for booleano', async () => {
      const response = await request(app)
        .patch('/families/fam-id/ciclos/ciclo-id/ativo')
        .send({ ativo: 'nao-booleano' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /families/:familiaId/ciclos/:id/rotacionar', () => {
    it('deve rotacionar tarefas', async () => {
      cicloRepository.findById
        .mockResolvedValueOnce(makeCiclo())
        .mockResolvedValueOnce(makeCiclo({ proximaRenovacao: new Date() }));
      tarefaRepository.findRevezamentoByCiclo.mockResolvedValue([
        { id: 't1', titulo: 'Lavar louça', responsavelAtualId: 'm1' },
        { id: 't2', titulo: 'Varrer', responsavelAtualId: 'm2' },
      ]);
      familyRepository.findMembrosAtivosByFamilia.mockResolvedValue([
        { id: 'm1', nome: 'Maria' },
        { id: 'm2', nome: 'João' },
      ]);
      tarefaRepository.updateResponsavel
        .mockResolvedValueOnce({ id: 't1', titulo: 'Lavar louça', responsavelAtualId: 'm1' })
        .mockResolvedValueOnce({ id: 't2', titulo: 'Varrer', responsavelAtualId: 'm2' });
      tarefaRepository.findExecucoesByTarefa.mockResolvedValue([
        { data: new Date('2026-07-06T10:00:00'), status: 'CONCLUIDA' },
        { data: new Date('2026-07-08T10:00:00'), status: 'CONCLUIDA' },
      ]);
      tarefaRepository.createExecucoes.mockResolvedValue({ count: 2 });

      const response = await request(app).post('/families/fam-id/ciclos/ciclo-id/rotacionar');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tarefas rotacionadas com sucesso');
    });
  });

  describe('GET /families/:familiaId/ciclos/verificar', () => {
    it('deve retornar ciclos vencidos', async () => {
      familyRepository.findFamiliaById.mockResolvedValue({ id: 'fam-id' });
      cicloRepository.findCiclosVencidos.mockResolvedValue([makeCiclo()]);
      familyRepository.findMembrosAtivosByFamilia.mockResolvedValue([
        { id: 'm1', usuarioId: 'u1', nome: 'Maria' },
      ]);

      const response = await request(app).get('/families/fam-id/ciclos/verificar');

      expect(response.status).toBe(200);
      expect(response.body.ciclosVencidos).toHaveLength(1);
    });
  });
});
