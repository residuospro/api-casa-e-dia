import {
  calcularProximaExecucao,
  RecorrenciaFinanceiraService,
  recorrenciaFinanceiraService,
} from './recorrencia-financeira.service';
import { AppError } from '../auth.service';
import { FrequenciaRecorrenciaFinanceira, TipoLancamento } from '../../models/enums';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    lancamento: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../repositories/financeiro/recorrencia-financeira.repository', () => ({
  recorrenciaFinanceiraRepository: {
    create: jest.fn(),
    findByLancamentoModeloId: jest.fn(),
    findById: jest.fn(),
    findDetalhada: jest.fn(),
    findComModelo: jest.fn(),
    findByFamiliaComFiltros: jest.fn(),
    findPendentes: jest.fn(),
    existsOcorrenciaIn: jest.fn(),
    updateIn: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    listarOcorrencias: jest.fn(),
  },
}));

jest.mock('./lancamento.service', () => ({
  lancamentoService: {
    criarDeRecorrencia: jest.fn(),
  },
}));

const { default: prisma } = jest.requireMock('../../config/database');
const { recorrenciaFinanceiraRepository } = jest.requireMock(
  '../../repositories/financeiro/recorrencia-financeira.repository',
);
const { lancamentoService } = jest.requireMock('./lancamento.service');

const txToken = { __tx: true };

function data(iso: string): Date {
  return new Date(iso);
}

function makeModelo(overrides = {}) {
  return {
    id: 'modelo-1',
    familiaId: 'fam-1',
    criadoPorId: 'membro-criador',
    responsavelId: 'membro-resp',
    tipo: 'DESPESA',
    titulo: 'Aluguel',
    descricao: null,
    valor: 1200,
    moeda: 'BRL',
    categoriaId: 'cat-1',
    subcategoriaId: null,
    centroCustoId: null,
    contaOrigemId: 'conta-1',
    contaDestinoId: null,
    cartaoId: null,
    formaPagamento: null,
    observacoes: 'Mensal',
    localizacao: null,
    ...overrides,
  };
}

function makeRecorrencia(overrides = {}) {
  return {
    id: 'rec-1',
    familiaId: 'fam-1',
    lancamentoModeloId: 'modelo-1',
    titulo: 'Aluguel',
    frequencia: FrequenciaRecorrenciaFinanceira.MENSAL,
    intervalo: 1,
    proximaExecucao: data('2026-08-10T10:00:00Z'),
    ultimaExecucao: null,
    ativa: true,
    lancamentoModelo: makeModelo(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(txToken),
  );
});

describe('calcularProximaExecucao', () => {
  it('diaria + 1 avanca um dia', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.DIARIA,
      1,
      data('2026-08-01T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-08-02T10:00:00.000Z');
  });

  it('diaria + 2 avanca dois dias', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.DIARIA,
      2,
      data('2026-08-01T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-08-03T10:00:00.000Z');
  });

  it('semanal + 1 avanca sete dias', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.SEMANAL,
      1,
      data('2026-08-01T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-08-08T10:00:00.000Z');
  });

  it('semanal + 2 avanca quatorze dias', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.SEMANAL,
      2,
      data('2026-08-01T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-08-15T10:00:00.000Z');
  });

  it('mensal + 1 avanca um mes', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      1,
      data('2026-08-10T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('mensal + 3 avanca tres meses', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      3,
      data('2026-08-10T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-11-10T10:00:00.000Z');
  });

  it('anual + 1 avanca um ano', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.ANUAL,
      1,
      data('2026-08-10T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2027-08-10T10:00:00.000Z');
  });

  it('clama dia 31 para o ultimo dia de fevereiro', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      1,
      data('2026-01-31T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-02-28T10:00:00.000Z');
  });

  it('seguindo o dia clamado: 28/02 -> 28/03', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      1,
      data('2026-02-28T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-03-28T10:00:00.000Z');
  });

  it('clama dia 30 para fevereiro', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      1,
      data('2026-08-30T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-09-30T10:00:00.000Z');
  });

  it('clama dia 31 de marco para abril (30 dias)', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      1,
      data('2026-08-31T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2026-09-30T10:00:00.000Z');
  });

  it('ano bissexto: 31/01/2024 + 1 mes -> 29/02/2024', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.MENSAL,
      1,
      data('2024-01-31T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2024-02-29T10:00:00.000Z');
  });

  it('anual: 29/02/2024 -> 28/02/2025 (ano nao bissexto)', () => {
    const r = calcularProximaExecucao(
      FrequenciaRecorrenciaFinanceira.ANUAL,
      1,
      data('2024-02-29T10:00:00Z'),
    );
    expect(r.toISOString()).toBe('2025-02-28T10:00:00.000Z');
  });
});

describe('RecorrenciaFinanceiraService.criar', () => {
  it('cria recorrencia quando o modelo pertence a familia e nao esta em uso', async () => {
    prisma.lancamento.findUnique.mockResolvedValue(makeModelo());
    recorrenciaFinanceiraRepository.findByLancamentoModeloId.mockResolvedValue(null);
    recorrenciaFinanceiraRepository.create.mockResolvedValue(makeRecorrencia());

    const dto = {
      lancamentoModeloId: 'modelo-1',
      titulo: 'Aluguel',
      frequencia: FrequenciaRecorrenciaFinanceira.MENSAL,
      proximaExecucao: '2026-08-10T10:00:00Z',
    };
    await recorrenciaFinanceiraService.criar('fam-1', dto);

    expect(recorrenciaFinanceiraRepository.create).toHaveBeenCalledWith(
      'fam-1',
      expect.objectContaining({ lancamentoModeloId: 'modelo-1', intervalo: 1 }),
    );
  });

  it('rejeita modelo de outra familia', async () => {
    prisma.lancamento.findUnique.mockResolvedValue(makeModelo({ familiaId: 'fam-2' }));
    await expect(
      recorrenciaFinanceiraService.criar('fam-1', {
        lancamentoModeloId: 'modelo-1',
        titulo: 'Aluguel',
        frequencia: FrequenciaRecorrenciaFinanceira.MENSAL,
        proximaExecucao: '2026-08-10T10:00:00Z',
      }),
    ).rejects.toThrow(AppError);
  });

  it('rejeita modelo inexistente', async () => {
    prisma.lancamento.findUnique.mockResolvedValue(null);
    await expect(
      recorrenciaFinanceiraService.criar('fam-1', {
        lancamentoModeloId: 'x',
        titulo: 'Aluguel',
        frequencia: FrequenciaRecorrenciaFinanceira.MENSAL,
        proximaExecucao: '2026-08-10T10:00:00Z',
      }),
    ).rejects.toThrow(AppError);
  });

  it('rejeita modelo ja usado em outra recorrencia', async () => {
    prisma.lancamento.findUnique.mockResolvedValue(makeModelo());
    recorrenciaFinanceiraRepository.findByLancamentoModeloId.mockResolvedValue({ id: 'outra-rec' });
    await expect(
      recorrenciaFinanceiraService.criar('fam-1', {
        lancamentoModeloId: 'modelo-1',
        titulo: 'Aluguel',
        frequencia: FrequenciaRecorrenciaFinanceira.MENSAL,
        proximaExecucao: '2026-08-10T10:00:00Z',
      }),
    ).rejects.toThrow(AppError);
  });
});

describe('RecorrenciaFinanceiraService.obter', () => {
  it('retorna recorrencia com ocorrencias recentes da mesma familia', async () => {
    recorrenciaFinanceiraRepository.findDetalhada.mockResolvedValue(makeRecorrencia());
    prisma.lancamento.findMany.mockResolvedValue([
      {
        id: 'l1',
        titulo: 'Aluguel',
        valor: 1200,
        moeda: 'BRL',
        status: 'PENDENTE',
        dataHora: data('2026-08-10'),
      },
    ]);

    const r = await recorrenciaFinanceiraService.obter('fam-1', 'rec-1');
    expect(r.id).toBe('rec-1');
    expect(r.ocorrenciasRecentes).toHaveLength(1);
  });

  it('rejeita recorrencia de outra familia', async () => {
    recorrenciaFinanceiraRepository.findDetalhada.mockResolvedValue(
      makeRecorrencia({ familiaId: 'fam-2' }),
    );
    await expect(recorrenciaFinanceiraService.obter('fam-1', 'rec-1')).rejects.toThrow(AppError);
  });
});

describe('RecorrenciaFinanceiraService.atualizar', () => {
  it('atualiza titulo/frequencia/intervalo/proximaExecucao/ativa', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(makeRecorrencia());
    recorrenciaFinanceiraRepository.update.mockResolvedValue(makeRecorrencia());

    await recorrenciaFinanceiraService.atualizar('fam-1', 'rec-1', {
      titulo: 'Netflix',
      ativa: false,
    });
    expect(recorrenciaFinanceiraRepository.update).toHaveBeenCalledWith(
      'rec-1',
      expect.objectContaining({ titulo: 'Netflix', ativa: false }),
    );
  });

  it('rejeita recorrencia de outra familia', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(
      makeRecorrencia({ familiaId: 'fam-2' }),
    );
    await expect(recorrenciaFinanceiraService.atualizar('fam-1', 'rec-1', {})).rejects.toThrow(
      AppError,
    );
  });
});

describe('RecorrenciaFinanceiraService.alterarStatus', () => {
  it('rejeita recorrencia de outra familia', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(
      makeRecorrencia({ familiaId: 'fam-2' }),
    );
    await expect(
      recorrenciaFinanceiraService.alterarStatus('fam-1', 'rec-1', false),
    ).rejects.toThrow(AppError);
  });

  it('inativa a recorrencia', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(makeRecorrencia());
    recorrenciaFinanceiraRepository.update.mockResolvedValue(makeRecorrencia({ ativa: false }));
    await recorrenciaFinanceiraService.alterarStatus('fam-1', 'rec-1', false);
    expect(recorrenciaFinanceiraRepository.update).toHaveBeenCalledWith('rec-1', { ativa: false });
  });
});

describe('RecorrenciaFinanceiraService.remover', () => {
  it('rejeita recorrencia de outra familia antes de excluir', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(
      makeRecorrencia({ familiaId: 'fam-2' }),
    );
    await expect(recorrenciaFinanceiraService.remover('fam-1', 'rec-1')).rejects.toThrow(AppError);
    expect(recorrenciaFinanceiraRepository.delete).not.toHaveBeenCalled();
  });

  it('exclui recorrencia da mesma familia', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(makeRecorrencia());
    await recorrenciaFinanceiraService.remover('fam-1', 'rec-1');
    expect(recorrenciaFinanceiraRepository.delete).toHaveBeenCalledWith('rec-1');
  });
});

describe('RecorrenciaFinanceiraService.processarExecucoesPendentes', () => {
  function transacaoComExecucao() {
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(txToken),
    );
  }

  it('gera ocorrencia para recorrencia atrasada e avanca ultima/proxima', async () => {
    transacaoComExecucao();
    recorrenciaFinanceiraRepository.findPendentes.mockResolvedValue([
      makeRecorrencia({ proximaExecucao: data('2026-06-10T10:00:00Z') }),
    ]);
    recorrenciaFinanceiraRepository.existsOcorrenciaIn.mockResolvedValue(null);

    const agora = data('2026-08-12T10:00:00Z');
    const resumo = await recorrenciaFinanceiraService.processarExecucoesPendentes(agora);

    // 10/06, 10/07, 10/08 -> tres ocorrencias
    expect(lancamentoService.criarDeRecorrencia).toHaveBeenCalledTimes(3);
    expect(resumo.geradas).toBe(3);

    // primeira chamada usa o modelo e a proxima data
    expect(lancamentoService.criarDeRecorrencia).toHaveBeenNthCalledWith(
      1,
      txToken,
      'fam-1',
      expect.objectContaining({ titulo: 'Aluguel', tipo: TipoLancamento.DESPESA, valor: 1200 }),
      expect.any(Date),
      'rec-1',
    );

    // atualizacao da recorrencia: proxima execucao = 10/09 (futuro) e ultima = 10/08
    const updateCall = recorrenciaFinanceiraRepository.updateIn.mock.calls[0];
    expect(updateCall[0]).toBe(txToken);
    expect(updateCall[1]).toBe('rec-1');
    expect(updateCall[2].proximaExecucao.toISOString()).toBe('2026-09-10T10:00:00.000Z');
    expect(updateCall[2].ultimaExecucao.toISOString()).toBe('2026-08-10T10:00:00.000Z');
  });

  it('nao duplica ocorrencia ja existente (idempotencia)', async () => {
    transacaoComExecucao();
    recorrenciaFinanceiraRepository.findPendentes.mockResolvedValue([
      makeRecorrencia({ proximaExecucao: data('2026-08-10T10:00:00Z') }),
    ]);
    recorrenciaFinanceiraRepository.existsOcorrenciaIn.mockResolvedValue({ id: 'ja-existe' });

    const agora = data('2026-08-12T10:00:00Z');
    const resumo = await recorrenciaFinanceiraService.processarExecucoesPendentes(agora);

    expect(lancamentoService.criarDeRecorrencia).not.toHaveBeenCalled();
    expect(resumo.geradas).toBe(0);

    const updateCall = recorrenciaFinanceiraRepository.updateIn.mock.calls[0];
    expect(updateCall[2].proximaExecucao.toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('recorrencia inativa nao e processada (findPendentes devolve apenas ativas)', async () => {
    transacaoComExecucao();
    recorrenciaFinanceiraRepository.findPendentes.mockResolvedValue([]);
    const resumo = await recorrenciaFinanceiraService.processarExecucoesPendentes(
      data('2026-08-12T10:00:00Z'),
    );
    expect(resumo.geradas).toBe(0);
    expect(lancamentoService.criarDeRecorrencia).not.toHaveBeenCalled();
  });

  it('recorrencia futura (proximaExecucao > agora) nao e processada', async () => {
    transacaoComExecucao();
    recorrenciaFinanceiraRepository.findPendentes.mockResolvedValue([
      makeRecorrencia({ proximaExecucao: data('2026-09-10T10:00:00Z') }),
    ]);
    // findPendentes nao deve ser chamado com datas futuras; mas se o for, garante que nada e gerado
    const agora = data('2026-08-12T10:00:00Z');
    await recorrenciaFinanceiraService.processarExecucoesPendentes(agora);
    expect(lancamentoService.criarDeRecorrencia).not.toHaveBeenCalled();
  });
});

describe('RecorrenciaFinanceiraService.executarManual', () => {
  it('gera a proxima ocorrencia e avanca o ciclo', async () => {
    recorrenciaFinanceiraRepository.findComModelo.mockResolvedValue(
      makeRecorrencia({ proximaExecucao: data('2026-09-10T10:00:00Z') }),
    );
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(
      makeRecorrencia({ proximaExecucao: data('2026-10-10T10:00:00Z') }),
    );
    recorrenciaFinanceiraRepository.existsOcorrenciaIn.mockResolvedValue(null);

    const resultado = await recorrenciaFinanceiraService.executarManual('fam-1', 'rec-1');

    expect(lancamentoService.criarDeRecorrencia).toHaveBeenCalledTimes(1);
    expect(resultado.gerada).toBe(true);

    const updateCall = recorrenciaFinanceiraRepository.updateIn.mock.calls[0];
    expect(updateCall[2].proximaExecucao.toISOString()).toBe('2026-10-10T10:00:00.000Z');
    expect(updateCall[2].ultimaExecucao.toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('nao duplica ocorrencia ja existente na execucao manual', async () => {
    recorrenciaFinanceiraRepository.findComModelo.mockResolvedValue(makeRecorrencia());
    recorrenciaFinanceiraRepository.existsOcorrenciaIn.mockResolvedValue({ id: 'existe' });
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(
      makeRecorrencia({ proximaExecucao: data('2026-09-10T10:00:00Z') }),
    );

    const resultado = await recorrenciaFinanceiraService.executarManual('fam-1', 'rec-1');

    expect(lancamentoService.criarDeRecorrencia).not.toHaveBeenCalled();
    expect(resultado.gerada).toBe(false);
  });

  it('rejeita recorrencia de outra familia', async () => {
    recorrenciaFinanceiraRepository.findComModelo.mockResolvedValue(
      makeRecorrencia({ familiaId: 'fam-2' }),
    );
    await expect(recorrenciaFinanceiraService.executarManual('fam-1', 'rec-1')).rejects.toThrow(
      AppError,
    );
  });

  it('rejeita recorrencia inativa', async () => {
    recorrenciaFinanceiraRepository.findComModelo.mockResolvedValue(
      makeRecorrencia({ ativa: false }),
    );
    await expect(recorrenciaFinanceiraService.executarManual('fam-1', 'rec-1')).rejects.toThrow(
      AppError,
    );
  });
});

describe('RecorrenciaFinanceiraService.listarOcorrencias', () => {
  it('rejeita quando a recorrencia e de outra familia', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(
      makeRecorrencia({ familiaId: 'fam-2' }),
    );
    await expect(
      recorrenciaFinanceiraService.listarOcorrencias(
        'fam-1',
        'rec-1',
        { pagina: 1, porPagina: 10 },
        {
          pagina: 1,
          por_pagina: 10,
        },
      ),
    ).rejects.toThrow(AppError);
  });

  it('lista ocorrencias paginadas da recorrencia da familia', async () => {
    recorrenciaFinanceiraRepository.findById.mockResolvedValue(makeRecorrencia());
    recorrenciaFinanceiraRepository.listarOcorrencias.mockResolvedValue({ data: [], total: 0 });

    const r = await recorrenciaFinanceiraService.listarOcorrencias(
      'fam-1',
      'rec-1',
      { pagina: 1, porPagina: 10 },
      { pagina: 1, por_pagina: 10 },
    );
    expect(r.data).toEqual([]);
    expect(recorrenciaFinanceiraRepository.listarOcorrencias).toHaveBeenCalledWith(
      'fam-1',
      'rec-1',
      {
        pagina: 1,
        porPagina: 10,
      },
    );
  });
});
