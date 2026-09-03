import { DashboardService } from './dashboard.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

jest.mock('../../repositories/financeiro/lancamento.repository', () => ({
  lancamentoRepository: {
    fluxoPorPeriodo: jest.fn(),
    despesasPorCategoriaMoeda: jest.fn(),
    porResponsavel: jest.fn(),
    pagosNoPeriodo: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/conta.repository', () => ({
  contaRepository: { findByFamilia: jest.fn() },
}));

jest.mock('../../repositories/financeiro/categoria-financeira.repository', () => ({
  categoriaFinanceiraRepository: { findByIds: jest.fn() },
}));

jest.mock('../../repositories/financeiro/meta-financeira.repository', () => ({
  metaFinanceiraRepository: {
    findByFamiliaStatusIn: jest.fn(),
    countByStatus: jest.fn(),
  },
}));

jest.mock('../../repositories/family.repository', () => ({
  familyRepository: { findMembrosByIds: jest.fn() },
}));

jest.mock('./orcamento.service', () => ({
  orcamentoService: { resumo: jest.fn() },
}));

const { lancamentoRepository } = jest.requireMock(
  '../../repositories/financeiro/lancamento.repository',
);
const { contaRepository } = jest.requireMock('../../repositories/financeiro/conta.repository');
const { categoriaFinanceiraRepository } = jest.requireMock(
  '../../repositories/financeiro/categoria-financeira.repository',
);
const { metaFinanceiraRepository } = jest.requireMock(
  '../../repositories/financeiro/meta-financeira.repository',
);
const { familyRepository } = jest.requireMock('../../repositories/family.repository');
const { orcamentoService } = jest.requireMock('./orcamento.service');

const dashboardService = new DashboardService();

describe('DashboardService.fluxoCaixa', () => {
  it('agrupa receitas e despesas por periodo/moeda/status, preenchendo lacunas com zero', async () => {
    lancamentoRepository.fluxoPorPeriodo.mockResolvedValue([
      {
        periodo: new Date('2026-08-01T00:00:00Z'),
        moeda: 'BRL',
        status: 'PAGO',
        receitas: 100,
        despesas: 0,
        quantidade: BigInt(1),
      },
      {
        periodo: new Date('2026-08-01T00:00:00Z'),
        moeda: 'BRL',
        status: 'PENDENTE',
        receitas: 0,
        despesas: 50,
        quantidade: BigInt(1),
      },
      {
        periodo: new Date('2026-08-03T00:00:00Z'),
        moeda: 'BRL',
        status: 'PAGO',
        receitas: 0,
        despesas: 20,
        quantidade: BigInt(1),
      },
      {
        periodo: new Date('2026-08-02T00:00:00Z'),
        moeda: 'USD',
        status: 'PAGO',
        receitas: 10,
        despesas: 0,
        quantidade: BigInt(1),
      },
    ]);

    const resultado = await dashboardService.fluxoCaixa(
      'fam-1',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-04T23:59:59Z'),
      'DIA' as 'DIA',
    );

    expect(resultado.granularidade).toBe('DIA');
    expect(resultado.porMoeda.map((m) => m.moeda)).toEqual(['BRL', 'USD']);

    const brl = resultado.porMoeda[0];
    expect(brl.serie.map((s) => s.periodo)).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
    ]);
    expect(brl.serie[0]).toEqual({
      periodo: '2026-08-01',
      receitas: 100,
      despesas: 50,
      saldo: 50,
      quantidade: 2,
      realizado: { receitas: 100, despesas: 0 },
      previsto: { receitas: 0, despesas: 50 },
    });
    expect(brl.serie[1].receitas).toBe(0);
    expect(brl.serie[1].despesas).toBe(0);
    expect(brl.serie[2].despesas).toBe(20);
    expect(brl.serie[3].receitas).toBe(0);
    expect(brl.totais).toEqual({
      receitas: 100,
      despesas: 70,
      saldo: 30,
      realizadoReceitas: 100,
      realizadoDespesas: 20,
      previstoReceitas: 0,
      previstoDespesas: 50,
    });

    const usd = resultado.porMoeda[1];
    expect(usd.serie).toHaveLength(4);
    expect(usd.serie[1].receitas).toBe(10);
    expect(usd.totais.receitas).toBe(10);
  });

  it('retorna porMoeda vazio quando nao ha lancamentos', async () => {
    lancamentoRepository.fluxoPorPeriodo.mockResolvedValue([]);
    const resultado = await dashboardService.fluxoCaixa(
      'fam-1',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-03T23:59:59Z'),
      'MES' as 'MES',
    );
    expect(resultado.porMoeda).toEqual([]);
  });
});

describe('DashboardService.evolucaoPatrimonio', () => {
  beforeEach(() => {
    contaRepository.findByFamilia.mockResolvedValue([]);
    lancamentoRepository.pagosNoPeriodo.mockResolvedValue([]);
  });

  it('reconstroi patrimonio por moeda a partir do saldo inicial e lancamentos PAGO', async () => {
    const agora = new Date();
    contaRepository.findByFamilia.mockResolvedValue([
      {
        id: 'conta-1',
        moeda: 'BRL',
        saldoInicial: 1000,
        criadoEm: new Date('2025-01-01T00:00:00Z'),
      },
    ]);
    lancamentoRepository.pagosNoPeriodo.mockResolvedValue([
      {
        id: 'l1',
        tipo: 'RECEITA',
        valor: 200,
        moeda: 'BRL',
        cartaoId: null,
        formaPagamento: null,
        orcamentoId: null,
        contaOrigemId: 'conta-1',
        contaDestinoId: null,
        dataHora: agora,
      },
    ]);

    const resultado = await dashboardService.evolucaoPatrimonio('fam-1', 12);

    expect(resultado.meses).toBe(12);
    expect(resultado.porMoeda).toHaveLength(1);
    const brl = resultado.porMoeda[0];
    expect(brl.moeda).toBe('BRL');
    expect(brl.serie).toHaveLength(12);
    expect(brl.serie[0].patrimonio).toBe(1000);
    expect(brl.patrimonioAtual).toBe(1200);
    expect(brl.serie[brl.serie.length - 1].patrimonio).toBe(1200);
  });

  it('neutraliza transferencias entre contas do mesmo patrimonio', async () => {
    const agora = new Date();
    contaRepository.findByFamilia.mockResolvedValue([
      { id: 'conta-a', moeda: 'BRL', saldoInicial: 0, criadoEm: new Date('2025-01-01T00:00:00Z') },
      { id: 'conta-b', moeda: 'BRL', saldoInicial: 0, criadoEm: new Date('2025-01-01T00:00:00Z') },
    ]);
    lancamentoRepository.pagosNoPeriodo.mockResolvedValue([
      {
        id: 't1',
        tipo: 'TRANSFERENCIA',
        valor: 300,
        moeda: 'BRL',
        cartaoId: null,
        formaPagamento: null,
        orcamentoId: null,
        contaOrigemId: 'conta-a',
        contaDestinoId: 'conta-b',
        dataHora: agora,
      },
    ]);

    const resultado = await dashboardService.evolucaoPatrimonio('fam-1', 6);

    const brl = resultado.porMoeda[0];
    expect(brl.serie.every((s) => s.patrimonio === 0)).toBe(true);
    expect(brl.patrimonioAtual).toBe(0);
  });

  it('acumula saldo inicial mais o efeito dos lancamentos ao longo dos meses', async () => {
    const agora = new Date();
    const mesAtual = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
    const mesAnterior = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 1, 15));
    contaRepository.findByFamilia.mockResolvedValue([
      {
        id: 'conta-1',
        moeda: 'BRL',
        saldoInicial: 1000,
        criadoEm: new Date('2025-01-01T00:00:00Z'),
      },
    ]);
    lancamentoRepository.pagosNoPeriodo.mockResolvedValue([
      {
        id: 'l1',
        tipo: 'RECEITA',
        valor: 300,
        moeda: 'BRL',
        cartaoId: null,
        formaPagamento: null,
        orcamentoId: null,
        contaOrigemId: 'conta-1',
        contaDestinoId: null,
        dataHora: mesAnterior,
      },
      {
        id: 'l2',
        tipo: 'DESPESA',
        valor: 100,
        moeda: 'BRL',
        cartaoId: null,
        formaPagamento: null,
        orcamentoId: null,
        contaOrigemId: 'conta-1',
        contaDestinoId: null,
        dataHora: mesAtual,
      },
    ]);

    const resultado = await dashboardService.evolucaoPatrimonio('fam-1', 3);

    const brl = resultado.porMoeda[0];
    const ultimoMes = brl.serie[brl.serie.length - 1];
    const penultimoMes = brl.serie[brl.serie.length - 2];
    expect(resultado.meses).toBe(3);
    expect(penultimoMes.patrimonio).toBe(1300);
    expect(ultimoMes.patrimonio).toBe(1200);
    expect(brl.patrimonioAtual).toBe(1200);
  });
});

describe('DashboardService.despesasPorCategoria', () => {
  it('agrupa despesas por categoria e moeda com percentual', async () => {
    lancamentoRepository.despesasPorCategoriaMoeda.mockResolvedValue([
      { categoriaId: 'cat-1', moeda: 'BRL', _sum: { valor: 300 }, _count: { _all: 2 } },
      { categoriaId: null, moeda: 'BRL', _sum: { valor: 100 }, _count: { _all: 1 } },
      { categoriaId: 'cat-2', moeda: 'USD', _sum: { valor: 50 }, _count: { _all: 1 } },
    ]);
    categoriaFinanceiraRepository.findByIds.mockResolvedValue([
      { id: 'cat-1', nome: 'Alimentacao', cor: '#f00', icone: 'al' },
      { id: 'cat-2', nome: 'Viagem', cor: '#00f', icone: 'vi' },
    ]);

    const resultado = await dashboardService.despesasPorCategoria(
      'fam-1',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-31T23:59:59Z'),
    );

    expect(categoriaFinanceiraRepository.findByIds).toHaveBeenCalledWith(['cat-1', 'cat-2']);
    expect(resultado.totais).toEqual([
      { moeda: 'BRL', total: 400 },
      { moeda: 'USD', total: 50 },
    ]);
    expect(resultado.porCategoria).toEqual([
      {
        categoria: { id: 'cat-1', nome: 'Alimentacao', cor: '#f00', icone: 'al' },
        moeda: 'BRL',
        valor: 300,
        percentual: 75,
        quantidade: 2,
      },
      {
        categoria: null,
        moeda: 'BRL',
        valor: 100,
        percentual: 25,
        quantidade: 1,
      },
      {
        categoria: { id: 'cat-2', nome: 'Viagem', cor: '#00f', icone: 'vi' },
        moeda: 'USD',
        valor: 50,
        percentual: 100,
        quantidade: 1,
      },
    ]);
  });
});

describe('DashboardService.metasProgresso', () => {
  it('lista metas em andamento + concluidas com resumo por status', async () => {
    metaFinanceiraRepository.findByFamiliaStatusIn
      .mockResolvedValueOnce([
        {
          id: 'm1',
          titulo: 'Reserva',
          descricao: null,
          tipo: 'OBJETIVO',
          valorObjetivo: 1000,
          valorAtual: 400,
          dataLimite: null,
          status: 'EM_ANDAMENTO',
          contaDestino: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'm2',
          titulo: 'Viagem',
          descricao: null,
          tipo: 'OBJETIVO',
          valorObjetivo: 200,
          valorAtual: 200,
          dataLimite: null,
          status: 'CONCLUIDA',
          contaDestino: null,
        },
      ]);
    metaFinanceiraRepository.countByStatus.mockResolvedValue([
      { status: 'EM_ANDAMENTO', _count: { _all: 1 } },
      { status: 'CONCLUIDA', _count: { _all: 2 } },
      { status: 'CANCELADA', _count: { _all: 1 } },
    ]);

    const resultado = await dashboardService.metasProgresso('fam-1');

    expect(metaFinanceiraRepository.findByFamiliaStatusIn).toHaveBeenNthCalledWith(1, 'fam-1', [
      'EM_ANDAMENTO',
    ]);
    expect(metaFinanceiraRepository.findByFamiliaStatusIn).toHaveBeenNthCalledWith(
      2,
      'fam-1',
      ['CONCLUIDA'],
      5,
    );

    expect(resultado.resumo).toEqual({
      total: 4,
      emAndamento: 1,
      concluidas: 2,
      canceladas: 1,
      valorObjetivo: 1200,
      valorAtual: 600,
      percentualGlobal: 50,
    });
    expect(resultado.metas).toHaveLength(2);
    const m1 = resultado.metas.find((m) => m.id === 'm1');
    const m2 = resultado.metas.find((m) => m.id === 'm2');
    expect(m1?.percentualConcluido).toBe(40);
    expect(m1?.valorRestante).toBe(600);
    expect(m2?.percentualConcluido).toBe(100);
    expect(m2?.valorRestante).toBe(0);
  });
});

describe('DashboardService.orcamentosResumo', () => {
  it('delega para o resumo de orcamentos do mes/ano', async () => {
    const payload = { mes: 8, ano: 2026, totalOrcado: 500, totalConsumido: 400 };
    orcamentoService.resumo.mockResolvedValue(payload);

    const resultado = await dashboardService.orcamentosResumo('fam-1', 8, 2026);

    expect(orcamentoService.resumo).toHaveBeenCalledWith('fam-1', 8, 2026);
    expect(resultado).toEqual(payload);
  });
});

describe('DashboardService.saldoContas', () => {
  it('retorna saldos por conta e totais por moeda', async () => {
    contaRepository.findByFamilia.mockResolvedValue([
      {
        id: 'c1',
        nome: 'Nubank',
        instituicao: 'Nubank',
        tipo: 'CONTA_BANCARIA',
        moeda: 'BRL',
        cor: '#820ad1',
        icone: 'bank',
        saldoAtual: 500,
        saldoPrevisto: 700,
      },
      {
        id: 'c2',
        nome: 'Dolar',
        instituicao: null,
        tipo: 'CARTEIRA',
        moeda: 'USD',
        cor: null,
        icone: null,
        saldoAtual: 10,
        saldoPrevisto: 12,
      },
    ]);

    const resultado = await dashboardService.saldoContas('fam-1');

    expect(resultado.contas).toHaveLength(2);
    expect(resultado.contas[0]).toMatchObject({
      id: 'c1',
      saldoAtual: 500,
      saldoPrevisto: 700,
      previsao: 200,
    });
    expect(resultado.totaisPorMoeda).toEqual([
      { moeda: 'BRL', saldoAtual: 500, saldoPrevisto: 700, previsao: 200 },
      { moeda: 'USD', saldoAtual: 10, saldoPrevisto: 12, previsao: 2 },
    ]);
  });
});

describe('DashboardService.gastosPorResponsavel', () => {
  it('agrupa despesas por responsavel com percentual e nome', async () => {
    lancamentoRepository.porResponsavel.mockResolvedValue([
      { responsavelId: 'm1', moeda: 'BRL', _sum: { valor: 400 }, _count: { _all: 2 } },
      { responsavelId: 'm3', moeda: 'BRL', _sum: { valor: 100 }, _count: { _all: 1 } },
    ]);
    familyRepository.findMembrosByIds.mockResolvedValue([
      { id: 'm1', usuarioId: 'u1', nome: 'Maria' },
    ]);

    const resultado = await dashboardService.gastosPorResponsavel(
      'fam-1',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-31T23:59:59Z'),
    );

    expect(familyRepository.findMembrosByIds).toHaveBeenCalledWith(['m1', 'm3']);
    expect(resultado.porResponsavel).toEqual([
      {
        responsavel: { id: 'm1', nome: 'Maria' },
        moeda: 'BRL',
        total: 400,
        quantidade: 2,
        percentual: 80,
      },
      {
        responsavel: { id: 'm3', nome: null },
        moeda: 'BRL',
        total: 100,
        quantidade: 1,
        percentual: 20,
      },
    ]);
    expect(resultado.totais).toEqual([{ moeda: 'BRL', total: 500 }]);
  });
});
