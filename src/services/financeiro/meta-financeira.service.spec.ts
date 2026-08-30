import { MetaFinanceiraService, metaFinanceiraService } from './meta-financeira.service';
import { AppError } from '../auth.service';
import { StatusMetaFinanceira, TipoMovimentacaoMeta } from '../../models/enums';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/meta-financeira.repository', () => ({
  metaFinanceiraRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByFamiliaWithFilters: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
    updateValorAndStatusIn: jest.fn(),
    createMovimentacaoIn: jest.fn(),
    findMovimentacoes: jest.fn(),
  },
}));

jest.mock('../../repositories/financeiro/conta.repository', () => ({
  contaRepository: { findById: jest.fn() },
}));

jest.mock('../../repositories/financeiro/lancamento.repository', () => ({
  lancamentoRepository: { aplicarImpactoSaldoIn: jest.fn() },
}));

const { default: prisma } = jest.requireMock('../../config/database');
const { metaFinanceiraRepository } = jest.requireMock(
  '../../repositories/financeiro/meta-financeira.repository',
);
const { contaRepository } = jest.requireMock('../../repositories/financeiro/conta.repository');
const { lancamentoRepository } = jest.requireMock('../../repositories/financeiro/lancamento.repository');

const txToken = { __tx: true };

function makeMeta(overrides = {}) {
  return {
    id: 'meta-1',
    familiaId: 'fam-1',
    titulo: 'Reserva de emergencia',
    descricao: null,
    tipo: 'OBJETIVO',
    valorObjetivo: 10000,
    valorAtual: 0,
    dataLimite: null,
    contaDestinoId: 'conta-1',
    status: StatusMetaFinanceira.EM_ANDAMENTO,
    imagem: null,
    criadoEm: new Date('2026-08-20T10:00:00Z'),
    atualizadoEm: new Date('2026-08-20T10:00:00Z'),
    ...overrides,
  };
}

function makeDto(overrides = {}) {
  return {
    titulo: 'Reserva de emergencia',
    valorObjetivo: 10000,
    ...overrides,
  };
}

function expectMeta404(promise: Promise<unknown>) {
  return expect(promise).rejects.toMatchObject({ statusCode: 404 });
}

describe('MetaFinanceiraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(txToken));
    metaFinanceiraRepository.updateValorAndStatusIn.mockImplementation(async () => makeMeta());
    metaFinanceiraRepository.createMovimentacaoIn.mockImplementation(
      async (dados: Record<string, unknown>) => ({ id: 'hist-1', ...dados }),
    );
    lancamentoRepository.aplicarImpactoSaldoIn.mockResolvedValue(undefined);
  });

  describe('criar', () => {
    it('cria meta com status EM_ANDAMENTO, valorAtual 0 e progresso calculado', async () => {
      const metaCriada = makeMeta();
      metaFinanceiraRepository.create.mockResolvedValue(metaCriada);

      const resultado = await metaFinanceiraService.criar('fam-1', makeDto());

      expect(metaFinanceiraRepository.create).toHaveBeenCalledWith('fam-1', makeDto());
      expect(resultado.status).toBe(StatusMetaFinanceira.EM_ANDAMENTO);
      expect(resultado.valorAtual).toBe(0);
      expect(resultado.percentualConcluido).toBe(0);
      expect(resultado.valorRestante).toBe(10000);
    });

    it('rejeita conta de destino que nao pertence a familia', async () => {
      contaRepository.findById.mockResolvedValueOnce({ id: 'conta-outra', familiaId: 'fam-x' });

      await expectMeta404(
        metaFinanceiraService.criar('fam-1', makeDto({ contaDestinoId: 'conta-outra' })),
      );
    });

    it('rejeita conta de destino inexistente', async () => {
      contaRepository.findById.mockResolvedValueOnce(null);

      await expectMeta404(
        metaFinanceiraService.criar('fam-1', makeDto({ contaDestinoId: 'conta-x' })),
      );
    });
  });

  describe('obter', () => {
    it('retorna meta com percentualConcluido e valorRestante', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 4000 }),
      );

      const resultado = await metaFinanceiraService.obter('fam-1', 'meta-1');

      expect(resultado.percentualConcluido).toBe(40);
      expect(resultado.valorRestante).toBe(6000);
    });

    it('limita percentual a 100% quando valorAtual ultrapassa objetivo', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 15000 }),
      );

      const resultado = await metaFinanceiraService.obter('fam-1', 'meta-1');

      expect(resultado.percentualConcluido).toBe(100);
      expect(resultado.valorRestante).toBe(0);
    });

    it('rejeita meta de outra familia', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ familiaId: 'fam-x' }),
      );

      await expectMeta404(metaFinanceiraService.obter('fam-1', 'meta-1'));
    });
  });

  describe('atualizar', () => {
    it('atualiza metadados e calcula progresso', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(makeMeta());
      metaFinanceiraRepository.update.mockResolvedValueOnce(
        makeMeta({ titulo: 'Novo titulo' }),
      );

      const resultado = await metaFinanceiraService.atualizar('fam-1', 'meta-1', {
        titulo: 'Novo titulo',
      });

      expect(metaFinanceiraRepository.update).toHaveBeenCalledWith('meta-1', {
        titulo: 'Novo titulo',
      });
      expect(resultado.titulo).toBe('Novo titulo');
    });

    it('conclui automaticamente quando objetivo reduzido abaixo do acumulado', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 4000 }),
      );
      metaFinanceiraRepository.update.mockResolvedValueOnce(makeMeta({ valorObjetivo: 3000 }));
      metaFinanceiraRepository.updateStatus.mockResolvedValueOnce(
        makeMeta({ valorObjetivo: 3000, status: StatusMetaFinanceira.CONCLUIDA }),
      );

      const resultado = await metaFinanceiraService.atualizar('fam-1', 'meta-1', {
        valorObjetivo: 3000,
      });

      expect(metaFinanceiraRepository.updateStatus).toHaveBeenCalledWith(
        'meta-1',
        StatusMetaFinanceira.CONCLUIDA,
      );
      expect(resultado.status).toBe(StatusMetaFinanceira.CONCLUIDA);
    });

    it('valida conta de destino ao trocar', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(makeMeta());
      contaRepository.findById.mockResolvedValueOnce(null);

      await expectMeta404(
        metaFinanceiraService.atualizar('fam-1', 'meta-1', { contaDestinoId: 'conta-x' }),
      );
    });
  });

  describe('cancelar', () => {
    it('cancela meta em andamento', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(makeMeta());
      metaFinanceiraRepository.updateStatus.mockResolvedValueOnce(
        makeMeta({ status: StatusMetaFinanceira.CANCELADA }),
      );

      const resultado = await metaFinanceiraService.cancelar('fam-1', 'meta-1');

      expect(metaFinanceiraRepository.updateStatus).toHaveBeenCalledWith(
        'meta-1',
        StatusMetaFinanceira.CANCELADA,
      );
      expect(resultado.status).toBe(StatusMetaFinanceira.CANCELADA);
    });

    it('nao permite cancelar meta ja concluida', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ status: StatusMetaFinanceira.CONCLUIDA }),
      );

      await expect(
        metaFinanceiraService.cancelar('fam-1', 'meta-1'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('remover', () => {
    it('remove fisicamente a meta da familia', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(makeMeta());
      metaFinanceiraRepository.delete.mockResolvedValueOnce(makeMeta());

      await metaFinanceiraService.remover('fam-1', 'meta-1');

      expect(metaFinanceiraRepository.delete).toHaveBeenCalledWith('meta-1');
    });

    it('rejeita remocao de meta de outra familia', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ familiaId: 'fam-x' }),
      );

      await expectMeta404(metaFinanceiraService.remover('fam-1', 'meta-1'));
      expect(metaFinanceiraRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('concluir', () => {
    it('conclui meta que atingiu o objetivo', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 10000 }),
      );
      metaFinanceiraRepository.updateStatus.mockResolvedValueOnce(
        makeMeta({ valorAtual: 10000, status: StatusMetaFinanceira.CONCLUIDA }),
      );

      const resultado = await metaFinanceiraService.concluir('fam-1', 'meta-1');

      expect(metaFinanceiraRepository.updateStatus).toHaveBeenCalledWith(
        'meta-1',
        StatusMetaFinanceira.CONCLUIDA,
      );
      expect(resultado.status).toBe(StatusMetaFinanceira.CONCLUIDA);
    });

    it('rejeita conclusao de meta que nao atingiu o objetivo', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 4000 }),
      );

      await expect(
        metaFinanceiraService.concluir('fam-1', 'meta-1'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('registrarMovimentacao', () => {
    it('adiciona ENTRADA, ajusta saldo da conta vinculada e grava historico', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 4000 }),
      );
      metaFinanceiraRepository.updateValorAndStatusIn.mockResolvedValueOnce(
        makeMeta({ valorAtual: 4500 }),
      );

      const resultado = await metaFinanceiraService.registrarMovimentacao('fam-1', 'meta-1', 'usr-1', {
        valor: 500,
        tipo: TipoMovimentacaoMeta.ENTRADA,
      });

      expect(metaFinanceiraRepository.updateValorAndStatusIn).toHaveBeenCalledWith(
        txToken,
        'meta-1',
        4500,
        StatusMetaFinanceira.EM_ANDAMENTO,
      );
      expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
        { contaId: 'conta-1', campo: 'saldoAtual', delta: 500 },
      ]);
      expect(metaFinanceiraRepository.createMovimentacaoIn).toHaveBeenCalledWith(
        txToken,
        expect.objectContaining({
          metaFinanceiraId: 'meta-1',
          usuarioId: 'usr-1',
          tipo: TipoMovimentacaoMeta.ENTRADA,
          valor: 500,
          saldoAnterior: 4000,
          saldoNovo: 4500,
        }),
      );
      expect(resultado.percentualConcluido).toBe(45);
      expect(resultado.movimentacao.id).toBe('hist-1');
    });

    it('conclui automaticamente quando valorAtual atinge o objetivo', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 9500 }),
      );

      await metaFinanceiraService.registrarMovimentacao('fam-1', 'meta-1', 'usr-1', {
        valor: 1000,
        tipo: TipoMovimentacaoMeta.ENTRADA,
      });

      expect(metaFinanceiraRepository.updateValorAndStatusIn).toHaveBeenCalledWith(
        txToken,
        'meta-1',
        10500,
        StatusMetaFinanceira.CONCLUIDA,
      );
    });

    it('impede SAIDA que deixaria o acumulado negativo', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 100 }),
      );

      await expect(
        metaFinanceiraService.registrarMovimentacao('fam-1', 'meta-1', 'usr-1', {
          valor: 500,
          tipo: TipoMovimentacaoMeta.SAIDA,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(metaFinanceiraRepository.updateValorAndStatusIn).not.toHaveBeenCalled();
    });

    it('reabre a meta (EM_ANDAMENTO) apos SAIDA que derruba abaixo do objetivo', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ valorAtual: 10000, status: StatusMetaFinanceira.CONCLUIDA }),
      );

      await metaFinanceiraService.registrarMovimentacao('fam-1', 'meta-1', 'usr-1', {
        valor: 100,
        tipo: TipoMovimentacaoMeta.SAIDA,
      });

      expect(metaFinanceiraRepository.updateValorAndStatusIn).toHaveBeenCalledWith(
        txToken,
        'meta-1',
        9900,
        StatusMetaFinanceira.EM_ANDAMENTO,
      );
      expect(lancamentoRepository.aplicarImpactoSaldoIn).toHaveBeenCalledWith(txToken, [
        { contaId: 'conta-1', campo: 'saldoAtual', delta: -100 },
      ]);
    });

    it('nao ajusta saldo quando a meta nao tem conta vinculada', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ contaDestinoId: null }),
      );

      await metaFinanceiraService.registrarMovimentacao('fam-1', 'meta-1', 'usr-1', {
        valor: 500,
        tipo: TipoMovimentacaoMeta.ENTRADA,
      });

      expect(lancamentoRepository.aplicarImpactoSaldoIn).not.toHaveBeenCalled();
    });

    it('bloqueia movimentacao em meta cancelada', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(
        makeMeta({ status: StatusMetaFinanceira.CANCELADA }),
      );

      await expect(
        metaFinanceiraService.registrarMovimentacao('fam-1', 'meta-1', 'usr-1', {
          valor: 500,
          tipo: TipoMovimentacaoMeta.ENTRADA,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(metaFinanceiraRepository.updateValorAndStatusIn).not.toHaveBeenCalled();
    });
  });

  describe('listarMovimentacoes', () => {
    it('retorna historico paginado apenas para meta da familia', async () => {
      metaFinanceiraRepository.findById.mockResolvedValueOnce(makeMeta());
      metaFinanceiraRepository.findMovimentacoes.mockResolvedValueOnce({ data: [], total: 0 });

      const resultado = await metaFinanceiraService.listarMovimentacoes(
        'fam-1',
        'meta-1',
        { pagina: 1, porPagina: 10 },
        { pagina: 1, por_pagina: 10 },
      );

      expect(metaFinanceiraRepository.findMovimentacoes).toHaveBeenCalledWith('meta-1', {
        pagina: 1,
        porPagina: 10,
      });
      expect(resultado.data).toEqual([]);
    });
  });
});