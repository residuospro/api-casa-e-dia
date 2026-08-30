import { OrcamentoService } from './orcamento.service';
import { AppError } from '../auth.service';
import { IndicadorOrcamento, StatusLancamento, TipoLancamento, TipoCategoriaFinanceira } from '../../models/enums';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/orcamento.repository', () => ({
  orcamentoRepository: {
    createIn: jest.fn(),
    findById: jest.fn(),
    findUniqueKey: jest.fn(),
    findUniqueKeyIn: jest.fn(),
    findByFamiliaWithFilters: jest.fn(),
    findAllByFamilia: jest.fn(),
    findByFamiliaMesAno: jest.fn(),
    updateIn: jest.fn(),
    deleteIn: jest.fn(),
    updateValorAtualIn: jest.fn(),
    desvincularLancamentosIn: jest.fn(),
    vincularLancamentosIn: jest.fn(),
    listConsumoByOrcamentoIn: jest.fn(),
    sumConsumoIn: jest.fn(),
    sumPagoByOrcamentoIn: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/conta.repository', () => ({
  contaRepository: { findById: jest.fn(), findByFamilia: jest.fn() },
}));

jest.mock('../../repositories/financeiro/categoria-financeira.repository', () => ({
  categoriaFinanceiraRepository: { findById: jest.fn(), findByIds: jest.fn() },
}));

jest.mock('../../repositories/financeiro/lancamento.repository', () => ({
  lancamentoRepository: { aplicarImpactoSaldoIn: jest.fn() },
}));

const { default: prisma } = jest.requireMock('../../config/database');
const { orcamentoRepository } = jest.requireMock('../../repositories/financeiro/orcamento.repository');
const { contaRepository } = jest.requireMock('../../repositories/financeiro/conta.repository');
const { categoriaFinanceiraRepository } = jest.requireMock('../../repositories/financeiro/categoria-financeira.repository');
const { lancamentoRepository } = jest.requireMock('../../repositories/financeiro/lancamento.repository');

const orcamentoService = new OrcamentoService();

const txToken = {
  __tx: true,
  lancamento: { findMany: jest.fn() },
};

function mockMesmaFamilia() {
  contaRepository.findById.mockResolvedValue({ id: 'conta-1', familiaId: 'fam-1', ativo: true });
  categoriaFinanceiraRepository.findById.mockResolvedValue({
    id: 'cat-1',
    familiaId: 'fam-1',
    tipo: TipoCategoriaFinanceira.DESPESA,
  });
}

function makeOrcamento(overrides = {}) {
  return {
    id: 'orc-1',
    familiaId: 'fam-1',
    categoriaId: 'cat-1',
    contaId: 'conta-1',
    mes: 8,
    ano: 2026,
    valorLimite: 500,
    valorAtual: 0,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    categoria: { id: 'cat-1', nome: 'Alimentacao', cor: '#fff', icone: 'x', tipo: 'DESPESA' },
    conta: { id: 'conta-1', nome: 'Conta', cor: '#000', icone: 'x' },
    ...overrides,
  };
}

describe('OrcamentoService.criar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txToken));
    (txToken.lancamento.findMany as jest.Mock).mockResolvedValue([]);
    lancamentoRepository.aplicarImpactoSaldoIn.mockResolvedValue(undefined);
    orcamentoRepository.createIn.mockResolvedValue(makeOrcamento());
    orcamentoRepository.updateValorAtualIn.mockResolvedValue({});
    orcamentoRepository.vincularLancamentosIn.mockResolvedValue({ count: 0 });
  });

  it('cria orcamento e reserva o valor limite no saldoAtual da conta', async () => {
    mockMesmaFamilia();
    orcamentoRepository.findUniqueKey.mockResolvedValue(null);

    const resultado = await orcamentoService.criar('fam-1', {
      categoriaId: 'cat-1',
      contaId: 'conta-1',
      mes: 8,
      ano: 2026,
      valorLimite: 500,
    });

    expect(orcamentoRepository.createIn).toHaveBeenCalledWith(
      txToken,
      'fam-1',
      expect.objectContaining({ valorLimite: 500 }),
    );
    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: -500 },
    ]);
    expect(orcamentoRepository.updateValorAtualIn).toHaveBeenCalledWith(txToken, 'orc-1', 0);
    expect(resultado.id).toBe('orc-1');
    expect(resultado.valorRestante).toBe(500);
    expect(resultado.indicador).toBe(IndicadorOrcamento.NORMAL);
  });

  it('rejeita categoria de receita', async () => {
    mockMesmaFamilia();
    categoriaFinanceiraRepository.findById.mockResolvedValue({ id: 'cat-rec', familiaId: 'fam-1', tipo: 'RECEITA' });
    await expect(
      orcamentoService.criar('fam-1', { categoriaId: 'cat-rec', contaId: 'conta-1', mes: 8, ano: 2026, valorLimite: 500 }),
    ).rejects.toThrow(new AppError('Orcamento deve ser criado para uma categoria de despesa', 400));
  });

  it('rejeita categoria de outra familia', async () => {
    mockMesmaFamilia();
    categoriaFinanceiraRepository.findById.mockResolvedValue({ id: 'cat-x', familiaId: 'outra', tipo: 'DESPESA' });
    await expect(
      orcamentoService.criar('fam-1', { categoriaId: 'cat-x', contaId: 'conta-1', mes: 8, ano: 2026, valorLimite: 500 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejeita conta inativa ou de outra familia', async () => {
    mockMesmaFamilia();
    contaRepository.findById.mockResolvedValue({ id: 'conta-1', familiaId: 'outra', ativo: true });
    await expect(
      orcamentoService.criar('fam-1', { categoriaId: 'cat-1', contaId: 'conta-1', mes: 8, ano: 2026, valorLimite: 500 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejeita orcamento duplicado para a categoria/mes', async () => {
    mockMesmaFamilia();
    orcamentoRepository.findUniqueKey.mockResolvedValue(makeOrcamento());
    await expect(
      orcamentoService.criar('fam-1', { categoriaId: 'cat-1', contaId: 'conta-1', mes: 8, ano: 2026, valorLimite: 500 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('adota retroativamente despesas da categoria/mes, reverte impacto e semeia valorAtual', async () => {
    mockMesmaFamilia();
    orcamentoRepository.findUniqueKey.mockResolvedValue(null);
    (txToken.lancamento.findMany as jest.Mock).mockResolvedValue([
      { id: 'l1', valor: 100, status: StatusLancamento.PAGO, contaOrigemId: 'conta-1', cartaoId: null, formaPagamento: null },
      { id: 'l2', valor: 50, status: StatusLancamento.PENDENTE, contaOrigemId: 'conta-1', cartaoId: null, formaPagamento: null },
      { id: 'l3', valor: 30, status: StatusLancamento.CANCELADO, contaOrigemId: 'conta-1', cartaoId: null, formaPagamento: null },
    ]);

    await orcamentoService.criar('fam-1', {
      categoriaId: 'cat-1',
      contaId: 'conta-1',
      mes: 8,
      ano: 2026,
      valorLimite: 500,
    });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenNthCalledWith(1, txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 100 },
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: 50 },
    ]);
    expect(orcamentoRepository.vincularLancamentosIn).toHaveBeenCalledWith(txToken, 'orc-1', ['l1', 'l2']);
    expect(orcamentoRepository.updateValorAtualIn).toHaveBeenCalledWith(txToken, 'orc-1', 150);
    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenNthCalledWith(2, txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: -500 },
    ]);
  });

  it('nao reverte despesa paga com cartao de credito na adocao retroativa', async () => {
    mockMesmaFamilia();
    orcamentoRepository.findUniqueKey.mockResolvedValue(null);
    (txToken.lancamento.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'l1',
        valor: 80,
        status: StatusLancamento.PAGO,
        contaOrigemId: 'conta-1',
        cartaoId: 'carta-1',
        formaPagamento: 'CREDITO',
      },
    ]);

    await orcamentoService.criar('fam-1', {
      categoriaId: 'cat-1',
      contaId: 'conta-1',
      mes: 8,
      ano: 2026,
      valorLimite: 500,
    });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledTimes(1);
    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: -500 },
    ]);
    expect(orcamentoRepository.updateValorAtualIn).toHaveBeenCalledWith(txToken, 'orc-1', 80);
  });
});

describe('OrcamentoService.listar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista paginado com indicadores quando nao ha filtro de status', async () => {
    orcamentoRepository.findByFamiliaWithFilters.mockResolvedValue({
      data: [makeOrcamento({ valorAtual: 400 })],
      total: 1,
    });

    const resultado = await orcamentoService.listar(
      'fam-1',
      {},
      { pagina: 1, porPagina: 10 },
      { pagina: 1, por_pagina: 10 },
    );

    expect(orcamentoRepository.findByFamiliaWithFilters).toHaveBeenCalledWith(
      'fam-1', {}, { pagina: 1, porPagina: 10 },
    );
    expect(resultado.data).toHaveLength(1);
    expect(resultado.data[0].percentualUtilizado).toBe(80);
    expect(resultado.data[0].indicador).toBe(IndicadorOrcamento.PROXIMO);
  });

  it('filtra por status em memoria', async () => {
    orcamentoRepository.findAllByFamilia.mockResolvedValue([
      makeOrcamento({ valorAtual: 520 }),
      makeOrcamento({ id: 'orc-2', valorAtual: 100 }),
    ]);

    const resultado = await orcamentoService.listar(
      'fam-1',
      { status: [IndicadorOrcamento.ULTRAPASSADO] },
      { pagina: 1, porPagina: 10 },
      { pagina: 1, por_pagina: 10 },
    );

    expect(resultado.data).toHaveLength(1);
    expect(resultado.data[0].id).toBe('orc-1');
  });
});

describe('OrcamentoService.obter', () => {
  it('retorna orcamento com indicador calculado', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento({ valorAtual: 200 }));

    const resultado = await orcamentoService.obter('fam-1', 'orc-1');

    expect(resultado.id).toBe('orc-1');
    expect(resultado.valorRestante).toBe(300);
    expect(resultado.percentualUtilizado).toBe(40);
    expect(resultado.indicador).toBe(IndicadorOrcamento.NORMAL);
  });

  it('rejeita orcamento de outra familia', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento({ familiaId: 'outra' }));
    await expect(orcamentoService.obter('fam-1', 'orc-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('OrcamentoService.atualizar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txToken));
    lancamentoRepository.aplicarImpactoSaldoIn.mockResolvedValue(undefined);
  });

  it('aumento do limite ajusta a reserva do saldoAtual', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento());
    orcamentoRepository.updateIn.mockResolvedValue(makeOrcamento({ valorLimite: 700 }));

    await orcamentoService.atualizar('fam-1', 'orc-1', { valorLimite: 700 });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 200 },
    ]);
    expect(orcamentoRepository.updateIn).toHaveBeenCalledWith(txToken, 'orc-1', { valorLimite: 700 });
  });

  it('troca de conta move a reserva entre as contas', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento());
    orcamentoRepository.updateIn.mockResolvedValue(makeOrcamento({ contaId: 'conta-2' }));
    contaRepository.findById.mockResolvedValue({ id: 'conta-2', familiaId: 'fam-1', ativo: true });

    await orcamentoService.atualizar('fam-1', 'orc-1', { contaId: 'conta-2' });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 500 },
      { contaId: 'conta-2', campo: 'saldoAtual', delta: -500 },
    ]);
  });

  it('sem alteracoes retorna sem transacionar', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento());

    await orcamentoService.atualizar('fam-1', 'orc-1', {});

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(orcamentoRepository.updateIn).not.toHaveBeenCalled();
  });
});

describe('OrcamentoService.remover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txToken));
    lancamentoRepository.aplicarImpactoSaldoIn.mockResolvedValue(undefined);
    orcamentoRepository.desvincularLancamentosIn.mockResolvedValue({ count: 0 });
    orcamentoRepository.deleteIn.mockResolvedValue({});
  });

  it('devolve a reserva nao gasta e reativa o saldoPrevisto dos pendentes', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento());
    orcamentoRepository.sumPagoByOrcamentoIn.mockResolvedValue({ _sum: { valor: 100 } });
    orcamentoRepository.listConsumoByOrcamentoIn.mockResolvedValue([
      { id: 'l1', valor: 50, status: StatusLancamento.PENDENTE, contaOrigemId: 'conta-1', cartaoId: null, formaPagamento: null },
      { id: 'l2', valor: 40, status: StatusLancamento.PAGO, contaOrigemId: 'conta-1', cartaoId: null, formaPagamento: null },
    ]);

    await orcamentoService.remover('fam-1', 'orc-1');

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenNthCalledWith(1, txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 400 },
    ]);
    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenNthCalledWith(2, txToken, [
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: -50 },
    ]);
    expect(orcamentoRepository.desvincularLancamentosIn).toHaveBeenCalledWith(txToken, 'orc-1');
    expect(orcamentoRepository.deleteIn).toHaveBeenCalledWith(txToken, 'orc-1');
  });

  it('sem pagos devolve o limite integral e nao mexe nos pendentes inexistentes', async () => {
    orcamentoRepository.findById.mockResolvedValue(makeOrcamento());
    orcamentoRepository.sumPagoByOrcamentoIn.mockResolvedValue({ _sum: { valor: null } });
    orcamentoRepository.listConsumoByOrcamentoIn.mockResolvedValue([]);

    await orcamentoService.remover('fam-1', 'orc-1');

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenNthCalledWith(1, txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 500 },
    ]);
    expect(orcamentoRepository.deleteIn).toHaveBeenCalledWith(txToken, 'orc-1');
  });
});

describe('OrcamentoService.resumo', () => {
  it('agrega totais e indicadores do mes', async () => {
    orcamentoRepository.findByFamiliaMesAno.mockResolvedValue([
      makeOrcamento({ valorAtual: 100 }),
      makeOrcamento({ id: 'orc-2', valorAtual: 520 }),
      makeOrcamento({ id: 'orc-3', valorAtual: 300 }),
    ]);

    const resultado = await orcamentoService.resumo('fam-1', 8, 2026);

    expect(orcamentoRepository.findByFamiliaMesAno).toHaveBeenCalledWith('fam-1', 8, 2026);
    expect(resultado.quantidadeOrcamentos).toBe(3);
    expect(resultado.totalOrcado).toBe(1500);
    expect(resultado.totalConsumido).toBe(920);
    expect(resultado.totalRestante).toBe(580);
    expect(resultado.percentualGlobal).toBe(61.33);
    expect(resultado.porIndicador).toEqual({
      [IndicadorOrcamento.NORMAL]: 2,
      [IndicadorOrcamento.PROXIMO]: 0,
      [IndicadorOrcamento.ULTRAPASSADO]: 1,
    });
  });
});

describe('OrcamentoService.integracao (cobertura/recalculo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('coberturaParaIn retorna null para tipos que nao sao despesa ou sem categoria', async () => {
    const tx = { __tx: true };
    expect(
      await orcamentoService.coberturaParaIn(tx as never, 'fam-1', { tipo: TipoLancamento.RECEITA, categoriaId: 'cat-1', dataHora: new Date() }),
    ).toBeNull();
    expect(
      await orcamentoService.coberturaParaIn(tx as never, 'fam-1', { tipo: TipoLancamento.DESPESA, categoriaId: null, dataHora: new Date() }),
    ).toBeNull();
    expect(orcamentoRepository.findUniqueKeyIn).not.toHaveBeenCalled();
  });

  it('coberturaParaIn localiza orcamento da categoria no mes/ano do lancamento', async () => {
    orcamentoRepository.findUniqueKeyIn.mockResolvedValue({ id: 'orc-1' });

    const resultado = await orcamentoService.coberturaParaIn(txToken as never, 'fam-1', {
      tipo: TipoLancamento.DESPESA,
      categoriaId: 'cat-1',
      dataHora: new Date(2026, 7, 15),
    });

    expect(orcamentoRepository.findUniqueKeyIn).toHaveBeenCalledWith(txToken, 'fam-1', 'cat-1', 8, 2026);
    expect(resultado).toBe('orc-1');
  });

  it('recalcularConsumoIn agrega os lancamentos vinculados e grava o valorAtual', async () => {
    orcamentoRepository.sumConsumoIn.mockResolvedValue({ _sum: { valor: 250 } });
    orcamentoRepository.updateValorAtualIn.mockResolvedValue({});

    await orcamentoService.recalcularConsumoIn(txToken as never, 'orc-1');

    expect(orcamentoRepository.sumConsumoIn).toHaveBeenCalledWith(txToken, 'orc-1');
    expect(orcamentoRepository.updateValorAtualIn).toHaveBeenCalledWith(txToken, 'orc-1', 250);
  });
});