import request from 'supertest';
import express from 'express';
import cors from 'cors';
import financeiroRoutes from '../../routes/financeiro.routes';
import { errorMiddleware } from '../../middlewares/error.middleware';

jest.mock('../../middlewares/auth.middleware', () => ({
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

jest.mock('../../repositories/family.repository', () => ({
  familyRepository: {
    findMembroByUsuarioAndFamilia: jest.fn(),
  },
}));

jest.mock('../../services/financeiro/recorrencia-financeira.service', () => ({
  recorrenciaFinanceiraService: {
    criar: jest.fn(),
    listar: jest.fn(),
    obter: jest.fn(),
    atualizar: jest.fn(),
    alterarStatus: jest.fn(),
    remover: jest.fn(),
    executarManual: jest.fn(),
    listarOcorrencias: jest.fn(),
  },
}));

const { familyRepository } = jest.requireMock('../../repositories/family.repository');
const { recorrenciaFinanceiraService } = jest.requireMock(
  '../../services/financeiro/recorrencia-financeira.service',
);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/financeiro', financeiroRoutes);
app.use(errorMiddleware);

const R = '/financeiro/fam-1/financeiro/recorrencias';

function membroValido() {
  familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue({
    id: 'membro-1',
    familiaId: 'fam-1',
  });
}

function membroInvalido() {
  familyRepository.findMembroByUsuarioAndFamilia.mockResolvedValue(null);
}

function makeRecorrencia(overrides = {}) {
  return {
    id: 'rec-1',
    familiaId: 'fam-1',
    lancamentoModeloId: 'modelo-1',
    titulo: 'Aluguel',
    frequencia: 'MENSAL',
    intervalo: 1,
    proximaExecucao: '2026-08-10T10:00:00Z',
    ultimaExecucao: null,
    ativa: true,
    ...overrides,
  };
}

const criarPayload = {
  lancamentoModeloId: 'modelo-1',
  titulo: 'Aluguel',
  frequencia: 'MENSAL',
  proximaExecucao: '2026-08-10T10:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /:familiaId/financeiro/recorrencias', () => {
  it('cria recorrencia com sucesso', async () => {
    membroValido();
    recorrenciaFinanceiraService.criar.mockResolvedValue(makeRecorrencia());

    const res = await request(app).post(R).send(criarPayload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('rec-1');
  });

  it('retorna 403 se usuario nao e membro da familia', async () => {
    membroInvalido();
    const res = await request(app).post(R).send(criarPayload);
    expect(res.status).toBe(403);
    expect(recorrenciaFinanceiraService.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 para payload invalido', async () => {
    membroValido();
    const res = await request(app).post(R).send({ titulo: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /:familiaId/financeiro/recorrencias', () => {
  it('lista recorrencias da familia', async () => {
    membroValido();
    recorrenciaFinanceiraService.listar.mockResolvedValue({
      filtro: {},
      ordenacao: [],
      paginacao: { total: 1, pagina: 1, por_pagina: 10, ultima_pagina: 1 },
      data: [makeRecorrencia()],
    });

    const res = await request(app).get(R);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('retorna 403 para nao membro', async () => {
    membroInvalido();
    const res = await request(app).get(R);
    expect(res.status).toBe(403);
  });
});

describe('GET /:familiaId/financeiro/recorrencias/:id', () => {
  it('retorna recorrencia por id', async () => {
    membroValido();
    recorrenciaFinanceiraService.obter.mockResolvedValue(makeRecorrencia());
    const res = await request(app).get(`${R}/rec-1`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('rec-1');
  });
});

describe('PUT /:familiaId/financeiro/recorrencias/:id', () => {
  it('atualiza recorrencia', async () => {
    membroValido();
    recorrenciaFinanceiraService.atualizar.mockResolvedValue(
      makeRecorrencia({ titulo: 'Netflix' }),
    );
    const res = await request(app).put(`${R}/rec-1`).send({ titulo: 'Netflix' });
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Netflix');
    expect(recorrenciaFinanceiraService.atualizar).toHaveBeenCalledWith('fam-1', 'rec-1', {
      titulo: 'Netflix',
    });
  });

  it('retorna 400 para paylload invalido', async () => {
    membroValido();
    const res = await request(app).put(`${R}/rec-1`).send({ intervalo: 0 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /:familiaId/financeiro/recorrencias/:id/status', () => {
  it('inativa recorrencia', async () => {
    membroValido();
    recorrenciaFinanceiraService.alterarStatus.mockResolvedValue(makeRecorrencia({ ativa: false }));
    const res = await request(app).patch(`${R}/rec-1/status`).send({ ativa: false });
    expect(res.status).toBe(200);
    expect(recorrenciaFinanceiraService.alterarStatus).toHaveBeenCalledWith(
      'fam-1',
      'rec-1',
      false,
    );
  });
});

describe('POST /:familiaId/financeiro/recorrencias/:id/executar', () => {
  it('executa recorrencia manualmente', async () => {
    membroValido();
    recorrenciaFinanceiraService.executarManual.mockResolvedValue({
      recorrenciaId: 'rec-1',
      gerada: true,
      proximaExecucao: '2026-09-10T10:00:00Z',
    });
    const res = await request(app).post(`${R}/rec-1/executar`);
    expect(res.status).toBe(200);
    expect(res.body.gerada).toBe(true);
  });
});

describe('GET /:familiaId/financeiro/recorrencias/:id/ocorrencias', () => {
  it('lista ocorrencias da recorrencia', async () => {
    membroValido();
    recorrenciaFinanceiraService.listarOcorrencias.mockResolvedValue({
      filtro: {},
      ordenacao: [],
      paginacao: { total: 1, pagina: 1, por_pagina: 10, ultima_pagina: 1 },
      data: [],
    });
    const res = await request(app).get(`${R}/rec-1/ocorrencias`);
    expect(res.status).toBe(200);
    expect(recorrenciaFinanceiraService.listarOcorrencias).toHaveBeenCalled();
  });
});

describe('DELETE /:familiaId/financeiro/recorrencias/:id', () => {
  it('remove recorrencia', async () => {
    membroValido();
    recorrenciaFinanceiraService.remover.mockResolvedValue(undefined);
    const res = await request(app).delete(`${R}/rec-1`);
    expect(res.status).toBe(204);
  });
});
