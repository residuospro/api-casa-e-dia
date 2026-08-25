import {
  LancamentoService,
  lancamentoService,
  calcularDeltasImpacto,
  usaCartaoCredito,
  EstadoFinanceiroLancamento,
} from './lancamento.service';
import { AppError } from '../auth.service';
import { StatusLancamento, TipoLancamento, FormaPagamento } from '../../models/enums';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/lancamento.repository', () => ({
  lancamentoRepository: {
    createIn: jest.fn(),
    findById: jest.fn(),
    findDetailed: jest.fn(),
    findByFamiliaComFiltros: jest.fn(),
    updateIn: jest.fn(),
    deleteIn: jest.fn(),
    substituirTagsIn: jest.fn(),
    createHistoricosIn: jest.fn(),
    aplicarImpactoSaldoIn: jest.fn(),
    resumoPorTipoStatus: jest.fn(),
    agruparPorCategoria: jest.fn(),
    agruparPorFormaPagamento: jest.fn(),
    movimentosPorConta: jest.fn(),
    agruparPorPeriodo: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/conta.repository', () => ({
  contaRepository: { findById: jest.fn(), findByFamilia: jest.fn() },
}));

jest.mock('../../repositories/financeiro/categoria-financeira.repository', () => ({
  categoriaFinanceiraRepository: { findById: jest.fn(), findByIds: jest.fn() },
}));

jest.mock('../../repositories/financeiro/subcategoria.repository', () => ({
  subcategoriaRepository: { findById: jest.fn() },
}));

jest.mock('../../repositories/financeiro/centro-custo.repository', () => ({
  centroCustoRepository: { findById: jest.fn() },
}));

jest.mock('../../repositories/financeiro/cartao.repository', () => ({
  cartaoRepository: { findById: jest.fn() },
}));

jest.mock('../../repositories/financeiro/tag.repository', () => ({
  tagRepository: { findByIds: jest.fn() },
}));

jest.mock('../../repositories/family.repository', () => ({
  familyRepository: { findMembroById: jest.fn(), findMembroByUsuarioAndFamilia: jest.fn() },
}));

const { default: prisma } = jest.requireMock('../../config/database');
const { lancamentoRepository } = jest.requireMock('../../repositories/financeiro/lancamento.repository');
const { contaRepository } = jest.requireMock('../../repositories/financeiro/conta.repository');
const { categoriaFinanceiraRepository } = jest.requireMock('../../repositories/financeiro/categoria-financeira.repository');
const { subcategoriaRepository } = jest.requireMock('../../repositories/financeiro/subcategoria.repository');
const { cartaoRepository } = jest.requireMock('../../repositories/financeiro/cartao.repository');
const { tagRepository } = jest.requireMock('../../repositories/financeiro/tag.repository');
const { familyRepository } = jest.requireMock('../../repositories/family.repository');

const txToken = { __tx: true };

function makeLancamento(overrides = {}) {
  return {
    id: 'lanc-1',
    familiaId: 'fam-1',
    criadoPorId: 'membro-criador',
    responsavelId: 'membro-resp',
    tipo: TipoLancamento.DESPESA,
    titulo: 'Mercado',
    descricao: null,
    valor: 100,
    moeda: 'BRL',
    categoriaId: 'cat-1',
    subcategoriaId: null,
    centroCustoId: null,
    contaOrigemId: 'conta-1',
    contaDestinoId: null,
    cartaoId: null,
    formaPagamento: null,
    dataHora: new Date('2026-08-20T10:00:00Z'),
    observacoes: null,
    status: StatusLancamento.PENDENTE,
    origem: 'MANUAL',
    confirmadoPeloUsuario: true,
    localizacao: null,
    ...overrides,
  };
}

function makeDtoBase(overrides = {}) {
  return {
    tipo: TipoLancamento.DESPESA,
    titulo: 'Mercado',
    valor: 100,
    contaOrigemId: 'conta-1',
    responsavelId: 'membro-resp',
    dataHora: '2026-08-20T10:00:00Z',
    ...overrides,
  };
}

function mockReferenciasValidas() {
  contaRepository.findById.mockImplementation(async (id: string) =>
    id === 'conta-1' || id === 'conta-2' ? { id, familiaId: 'fam-1' } : null,
  );
  familyRepository.findMembroById.mockResolvedValue({ id: 'membro-resp', familiaId: 'fam-1' });
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txToken));
});

describe('calcularDeltasImpacto', () => {
  const base: EstadoFinanceiroLancamento = {
    tipo: TipoLancamento.DESPESA,
    valor: 100,
    status: StatusLancamento.PENDENTE,
    contaOrigemId: 'conta-1',
    contaDestinoId: null,
    afetaConta: true,
  };

  it('despesa pendente afeta apenas saldoPrevisto com delta negativo', () => {
    expect(calcularDeltasImpacto(base)).toEqual([
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: -100 },
    ]);
  });

  it('despesa paga afeta apenas saldoAtual', () => {
    const deltas = calcularDeltasImpacto({ ...base, status: StatusLancamento.PAGO });
    expect(deltas).toEqual([{ contaId: 'conta-1', campo: 'saldoAtual', delta: -100 }]);
  });

  it('cancelado e ignorado nao afetam saldo', () => {
    expect(calcularDeltasImpacto({ ...base, status: StatusLancamento.CANCELADO })).toEqual([]);
    expect(calcularDeltasImpacto({ ...base, status: StatusLancamento.IGNORADO })).toEqual([]);
  });

  it('receita soma no saldo', () => {
    const deltas = calcularDeltasImpacto({
      ...base,
      tipo: TipoLancamento.RECEITA,
      status: StatusLancamento.PAGO,
    });
    expect(deltas).toEqual([{ contaId: 'conta-1', campo: 'saldoAtual', delta: 100 }]);
  });

  it('ajuste negativo gera delta negativo', () => {
    const deltas = calcularDeltasImpacto({
      ...base,
      tipo: TipoLancamento.AJUSTE,
      valor: -50,
      status: StatusLancamento.PAGO,
    });
    expect(deltas).toEqual([{ contaId: 'conta-1', campo: 'saldoAtual', delta: -50 }]);
  });

  it('transferencia move entre as duas contas', () => {
    const deltas = calcularDeltasImpacto({
      ...base,
      tipo: TipoLancamento.TRANSFERENCIA,
      contaOrigemId: 'conta-1',
      contaDestinoId: 'conta-2',
      status: StatusLancamento.PAGO,
    });
    expect(deltas).toEqual([
      { contaId: 'conta-1', campo: 'saldoAtual', delta: -100 },
      { contaId: 'conta-2', campo: 'saldoAtual', delta: 100 },
    ]);
  });

  it('despesa de cartao de credito nao afeta conta', () => {
    expect(
      calcularDeltasImpacto({ ...base, status: StatusLancamento.PAGO, afetaConta: false }),
    ).toEqual([]);
  });
});

describe('usaCartaoCredito', () => {
  it('verdadeiro apenas para despesa com cartao e credito', () => {
    expect(
      usaCartaoCredito({ tipo: TipoLancamento.DESPESA, cartaoId: 'c1', formaPagamento: FormaPagamento.CREDITO }),
    ).toBe(true);
    expect(
      usaCartaoCredito({ tipo: TipoLancamento.DESPESA, cartaoId: 'c1', formaPagamento: FormaPagamento.DEBITO }),
    ).toBe(false);
    expect(
      usaCartaoCredito({ tipo: TipoLancamento.RECEITA, cartaoId: 'c1', formaPagamento: FormaPagamento.CREDITO }),
    ).toBe(false);
  });
});

describe('LancamentoService.criar', () => {
  it('cria despesa como PENDENTE/MANUAL, aplica saldo previsto e registra historico', async () => {
    mockReferenciasValidas();
    lancamentoRepository.createIn.mockResolvedValue(makeLancamento());

    await lancamentoService.criar('fam-1', 'membro-criador', 'usuario-1', makeDtoBase());

    expect(lancamentoRepository.createIn).toHaveBeenCalledWith(
      txToken,
      'fam-1',
      'membro-criador',
      expect.objectContaining({ status: StatusLancamento.PENDENTE, origem: 'MANUAL' }),
    );
    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: -100 },
    ]);
    expect(lancamentoRepository.createHistoricosIn).toHaveBeenCalledWith(
      txToken,
      [expect.objectContaining({ campo: 'CRIACAO', usuarioId: 'usuario-1' })],
    );
  });

  it('transferencia exige contas diferentes', async () => {
    mockReferenciasValidas();
    await expect(
      lancamentoService.criar(
        'fam-1',
        'm',
        'u',
        makeDtoBase({ tipo: TipoLancamento.TRANSFERENCIA, contaOrigemId: 'conta-1', contaDestinoId: 'conta-1' }),
      ),
    ).rejects.toThrow(AppError);
  });

  it('transferencia sem destino e rejeitada', async () => {
    mockReferenciasValidas();
    await expect(
      lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase({ tipo: TipoLancamento.TRANSFERENCIA })),
    ).rejects.toThrow(new AppError('Transferencia exige conta de destino', 400));
  });

  it('transferencia nao pode ter categoria', async () => {
    mockReferenciasValidas();
    await expect(
      lancamentoService.criar(
        'fam-1',
        'm',
        'u',
        makeDtoBase({ tipo: TipoLancamento.TRANSFERENCIA, contaDestinoId: 'conta-2', categoriaId: 'cat-1' }),
      ),
    ).rejects.toThrow('TRANSFERENCIA nao deve possuir categoria ou subcategoria');
  });

  it('ajuste com valor zero e rejeitado', async () => {
    mockReferenciasValidas();
    await expect(
      lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase({ tipo: TipoLancamento.AJUSTE, valor: 0 })),
    ).rejects.toThrow('Valor do ajuste deve ser diferente de zero');
  });

  it('ajuste aceita valor negativo e aplica na contaOrigem', async () => {
    mockReferenciasValidas();
    lancamentoRepository.createIn.mockResolvedValue(makeLancamento());

    await lancamentoService.criar(
      'fam-1',
      'm',
      'u',
      makeDtoBase({ tipo: TipoLancamento.AJUSTE, valor: -30 }),
    );

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: -30 },
    ]);
  });

  it('despesa com valor negativo e rejeitada', async () => {
    mockReferenciasValidas();
    await expect(lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase({ valor: -10 }))).rejects.toThrow(
      'Valor deve ser maior que zero',
    );
  });

  it('conta de outra familia gera 404', async () => {
    contaRepository.findById.mockResolvedValue({ id: 'conta-x', familiaId: 'outra-familia' });
    await expect(lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase())).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('responsavel de outra familia gera 404', async () => {
    contaRepository.findById.mockResolvedValue({ id: 'conta-1', familiaId: 'fam-1' });
    familyRepository.findMembroById.mockResolvedValue({ id: 'membro-resp', familiaId: 'outra-familia' });
    await expect(lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase())).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('categoria de outro tipo que o lancamento e rejeitada', async () => {
    mockReferenciasValidas();
    categoriaFinanceiraRepository.findById.mockResolvedValue({
      id: 'cat-desp',
      familiaId: 'fam-1',
      tipo: 'DESPESA',
    });
    await expect(
      lancamentoService.criar(
        'fam-1',
        'm',
        'u',
        makeDtoBase({ tipo: TipoLancamento.RECEITA, categoriaId: 'cat-desp' }),
      ),
    ).rejects.toThrow('Categoria nao compativel com o tipo do lancamento');
  });

  it('subcategoria de outra categoria e rejeitada', async () => {
    mockReferenciasValidas();
    categoriaFinanceiraRepository.findById.mockResolvedValue({
      id: 'cat-1',
      familiaId: 'fam-1',
      tipo: 'DESPESA',
    });
    subcategoriaRepository.findById.mockResolvedValue({ id: 'sub-1', categoriaId: 'cat-outra' });
    await expect(
      lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase({ categoriaId: 'cat-1', subcategoriaId: 'sub-1' })),
    ).rejects.toThrow('Subcategoria nao pertence a categoria informada');
  });

  it('tag de outra familia e rejeitada', async () => {
    mockReferenciasValidas();
    tagRepository.findByIds.mockResolvedValue([{ id: 'tag-1', familiaId: 'outra-familia' }]);
    await expect(
      lancamentoService.criar('fam-1', 'm', 'u', makeDtoBase({ tagsIds: ['tag-1'] })),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('LancamentoService.alterarStatus', () => {
  it('PENDENTE -> PAGO remove impacto previsto e aplica no atual', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento());
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));

    await lancamentoService.alterarStatus('fam-1', 'usuario-1', 'lanc-1', { status: StatusLancamento.PAGO });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: 100 },
      { contaId: 'conta-1', campo: 'saldoAtual', delta: -100 },
    ]);
    expect(lancamentoRepository.updateIn).toHaveBeenCalledWith(txToken, 'lanc-1', {
      status: StatusLancamento.PAGO,
    });
    expect(lancamentoRepository.createHistoricosIn).toHaveBeenCalledWith(
      txToken,
      [expect.objectContaining({ campo: 'STATUS', valorAnterior: 'PENDENTE', novoValor: 'PAGO' })],
    );
  });

  it('PAGO -> CANCELADO remove impacto do saldoAtual', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento({ status: StatusLancamento.CANCELADO }));

    await lancamentoService.alterarStatus('fam-1', 'u', 'lanc-1', { status: StatusLancamento.CANCELADO });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 100 },
    ]);
  });

  it('mesmo status e idempotente e nao transaciona', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));

    await lancamentoService.alterarStatus('fam-1', 'u', 'lanc-1', { status: StatusLancamento.PAGO });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(lancamentoRepository.updateIn).not.toHaveBeenCalled();
  });

  it('CANCELADO -> IGNORADO direto nao e permitido', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.CANCELADO }));

    await expect(
      lancamentoService.alterarStatus('fam-1', 'u', 'lanc-1', { status: StatusLancamento.IGNORADO }),
    ).rejects.toThrow('Transicao de status CANCELADO para IGNORADO nao permitida');
  });

  it('IGNORADO -> PENDENTE reabre', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.IGNORADO }));
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento({ status: StatusLancamento.PENDENTE }));

    await lancamentoService.alterarStatus('fam-1', 'u', 'lanc-1', { status: StatusLancamento.PENDENTE });

    expect(lancamentoRepository.updateIn).toHaveBeenCalledWith(txToken, 'lanc-1', {
      status: StatusLancamento.PENDENTE,
    });
  });

  it('lançamento de outra familia gera 404', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ familiaId: 'outra' }));
    await expect(
      lancamentoService.alterarStatus('fam-1', 'u', 'lanc-1', { status: StatusLancamento.PAGO }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('LancamentoService.atualizar', () => {
  it('alteracao de valor reverte impacto anterior e aplica o novo', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));
    mockReferenciasValidas();

    await lancamentoService.atualizar('fam-1', 'usuario-1', 'lanc-1', { valor: 250 });

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 100 },
      { contaId: 'conta-1', campo: 'saldoAtual', delta: -250 },
    ]);
    expect(lancamentoRepository.createHistoricosIn).toHaveBeenCalledWith(
      txToken,
      [expect.objectContaining({ campo: 'VALOR', valorAnterior: '100', novoValor: '250' })],
    );
  });

  it('mudanca para transferencia sem destino e bloqueada', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento());
    await expect(
      lancamentoService.atualizar('fam-1', 'u', 'lanc-1', { tipo: TipoLancamento.TRANSFERENCIA }),
    ).rejects.toThrow('Transferencia exige conta de destino');
  });

  it('lançamento de outra familia gera 404', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ familiaId: 'outra' }));
    await expect(lancamentoService.atualizar('fam-1', 'u', 'lanc-1', { titulo: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('LancamentoService.remover', () => {
  it('excluir pago reverte saldoAtual, registra historico e deleta', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.PAGO }));
    const ordens: string[] = [];
    lancamentoRepository.createHistoricosIn.mockImplementation(async () => {
      ordens.push('historico');
    });
    lancamentoRepository.deleteIn.mockImplementation(async () => {
      ordens.push('delete');
    });

    await lancamentoService.remover('fam-1', 'usuario-1', 'lanc-1');

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoAtual', delta: 100 },
    ]);
    expect(ordens).toEqual(['historico', 'delete']);
    expect(lancamentoRepository.createHistoricosIn).toHaveBeenCalledWith(
      txToken,
      [expect.objectContaining({ campo: 'EXCLUSAO' })],
    );
  });

  it('excluir pendente reverte saldoPrevisto', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.PENDENTE }));

    await lancamentoService.remover('fam-1', 'u', 'lanc-1');

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
      { contaId: 'conta-1', campo: 'saldoPrevisto', delta: 100 },
    ]);
  });

  it('excluir cancelado nao altera saldos', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ status: StatusLancamento.CANCELADO }));

    await lancamentoService.remover('fam-1', 'u', 'lanc-1');

    expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, []);
  });

  it('lançamento de outra familia gera 404', async () => {
    lancamentoRepository.findById.mockResolvedValue(makeLancamento({ familiaId: 'outra' }));
    await expect(lancamentoService.remover('fam-1', 'u', 'lanc-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('LancamentoService.obter', () => {
  it('retorna lancamento detalhado da propria familia', async () => {
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento());
    const resultado = await new LancamentoService().obter('fam-1', 'lanc-1');
    expect(resultado).toBeDefined();
  });

  it('nao retorna lancamento de outra familia', async () => {
    lancamentoRepository.findDetailed.mockResolvedValue(makeLancamento({ familiaId: 'outra' }));
    await expect(new LancamentoService().obter('fam-1', 'lanc-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('LancamentoService.resumo', () => {
  it('consolida totais por tipo e status, excluindo cancelados', async () => {
    lancamentoRepository.resumoPorTipoStatus.mockResolvedValue([
      { tipo: TipoLancamento.RECEITA, status: StatusLancamento.PAGO, _sum: { valor: 500 }, _count: { _all: 3 } },
      { tipo: TipoLancamento.RECEITA, status: StatusLancamento.PENDENTE, _sum: { valor: 200 }, _count: { _all: 1 } },
      { tipo: TipoLancamento.DESPESA, status: StatusLancamento.PAGO, _sum: { valor: 300 }, _count: { _all: 2 } },
      { tipo: TipoLancamento.DESPESA, status: StatusLancamento.PENDENTE, _sum: { valor: 150 }, _count: { _all: 1 } },
      { tipo: TipoLancamento.TRANSFERENCIA, status: StatusLancamento.PAGO, _sum: { valor: 100 }, _count: { _all: 1 } },
      { tipo: TipoLancamento.AJUSTE, status: StatusLancamento.PAGO, _sum: { valor: 10 }, _count: { _all: 1 } },
    ]);

    const inicio = new Date('2026-08-01T00:00:00Z');
    const fim = new Date('2026-08-31T23:59:59Z');
    const resumo = await lancamentoService.resumo('fam-1', inicio, fim);

    expect(resumo.totalReceitas).toBe(700);
    expect(resumo.totalDespesas).toBe(450);
    expect(resumo.saldoPeriodo).toBe(250);
    expect(resumo.receitasRecebidas).toBe(500);
    expect(resumo.receitasPendentes).toBe(200);
    expect(resumo.despesasPagas).toBe(300);
    expect(resumo.despesasPendentes).toBe(150);
    expect(resumo.totalTransferencias).toBe(100);
    expect(resumo.totalAjustes).toBe(10);
    expect(resumo.quantidadeLancamentos).toBe(9);
  });
});
