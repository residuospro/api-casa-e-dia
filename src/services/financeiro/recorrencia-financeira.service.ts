import prisma from '../../config/database';
import { Prisma } from '../../generated/prisma-client';
import { recorrenciaFinanceiraRepository } from '../../repositories/financeiro/recorrencia-financeira.repository';
import { lancamentoService } from './lancamento.service';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';
import {
  FrequenciaRecorrenciaFinanceira,
  TipoLancamento,
  Moeda,
  FormaPagamento,
} from '../../models/enums';
import {
  CriarRecorrenciaFinanceiraDTO,
  AtualizarRecorrenciaFinanceiraDTO,
  FiltrosRecorrencia,
} from '../../models/financeiro/recorrencia-financeira.model';

/**
 * Limite de ocorrencias geradas por recorrencia em uma unica execucao do
 * scheduler. Protege o processamento de atrasos muito grandes (evita criar
 * centenas de lancamentos de uma so vez e possiveis loops).
 */
const MAX_OCORRENCIAS_POR_EXECUCAO = 500;

function adicionarMeses(data: Date, meses: number): Date {
  const d = new Date(data);
  const diaBase = d.getDate();
  const mesAlvoIndex = d.getMonth() + meses;
  const anoAlvo = d.getFullYear() + Math.floor(mesAlvoIndex / 12);
  const mesAlvo = ((mesAlvoIndex % 12) + 12) % 12;
  const ultimoDia = new Date(anoAlvo, mesAlvo + 1, 0).getDate();
  const diaAlvo = Math.min(diaBase, ultimoDia);
  return new Date(
    anoAlvo,
    mesAlvo,
    diaAlvo,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

function adicionarAnos(data: Date, anos: number): Date {
  const d = new Date(data);
  const diaBase = d.getDate();
  const anoAlvo = d.getFullYear() + anos;
  const mes = d.getMonth();
  const ultimoDia = new Date(anoAlvo, mes + 1, 0).getDate();
  const diaAlvo = Math.min(diaBase, ultimoDia);
  return new Date(
    anoAlvo,
    mes,
    diaAlvo,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

export type FrequenciaRecorrenciaFinanceiraValue =
  | FrequenciaRecorrenciaFinanceira.DIARIA
  | FrequenciaRecorrenciaFinanceira.SEMANAL
  | FrequenciaRecorrenciaFinanceira.MENSAL
  | FrequenciaRecorrenciaFinanceira.ANUAL;

/**
 * Calcula a proxima data de execucao a partir de uma data base,
 * respeitando frequencia e intervalo.
 *
 * Regra de fim de mes: se o dia base nao existir no mes alvo (ex: 31 em
 * fevereiro), a data e "clamada" para o ultimo dia do mes alvo. A partir desse
 * ponto, as proximas iteracoes usam o dia ja clamado como base (ex:
 * 31/08 -> 30/09 -> 30/10).
 */
export function calcularProximaExecucao(
  frequencia: FrequenciaRecorrenciaFinanceiraValue | string,
  intervalo: number,
  dataBase: Date,
): Date {
  const d = new Date(dataBase);

  switch (frequencia) {
    case FrequenciaRecorrenciaFinanceira.DIARIA:
      d.setDate(d.getDate() + intervalo);
      return d;
    case FrequenciaRecorrenciaFinanceira.SEMANAL:
      d.setDate(d.getDate() + intervalo * 7);
      return d;
    case FrequenciaRecorrenciaFinanceira.MENSAL:
      return adicionarMeses(dataBase, intervalo);
    case FrequenciaRecorrenciaFinanceira.ANUAL:
      return adicionarAnos(dataBase, intervalo);
    default:
      return d;
  }
}

interface ModeloLancamento {
  criadoPorId: string;
  responsavelId: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  valor: Prisma.Decimal | number;
  moeda: string;
  categoriaId: string | null;
  subcategoriaId: string | null;
  centroCustoId: string | null;
  contaOrigemId: string;
  contaDestinoId: string | null;
  cartaoId: string | null;
  formaPagamento: string | null;
  observacoes: string | null;
  localizacao: string | null;
}

function normalizarModelo(m: ModeloLancamento) {
  return {
    criadoPorId: m.criadoPorId,
    responsavelId: m.responsavelId,
    tipo: m.tipo as TipoLancamento,
    titulo: m.titulo,
    descricao: m.descricao,
    valor: m.valor,
    moeda: m.moeda as Moeda,
    categoriaId: m.categoriaId,
    subcategoriaId: m.subcategoriaId,
    centroCustoId: m.centroCustoId,
    contaOrigemId: m.contaOrigemId,
    contaDestinoId: m.contaDestinoId,
    cartaoId: m.cartaoId,
    formaPagamento: m.formaPagamento as FormaPagamento | null,
    observacoes: m.observacoes,
    localizacao: m.localizacao,
  };
}

export class RecorrenciaFinanceiraService {
  // ==================== CRUD ====================

  async criar(familiaId: string, dto: CriarRecorrenciaFinanceiraDTO) {
    const modelo = await prisma.lancamento.findUnique({ where: { id: dto.lancamentoModeloId } });
    if (!modelo || modelo.familiaId !== familiaId) {
      throw new AppError('Lancamento modelo nao encontrado nesta familia', 404);
    }

    const jaUtilizado = await recorrenciaFinanceiraRepository.findByLancamentoModeloId(
      dto.lancamentoModeloId,
    );
    if (jaUtilizado) {
      throw new AppError('Este lancamento ja e usado como modelo de uma recorrencia', 400);
    }

    return recorrenciaFinanceiraRepository.create(familiaId, {
      ...dto,
      intervalo: dto.intervalo ?? 1,
    });
  }

  async listar(
    familiaId: string,
    filtros: FiltrosRecorrencia,
    options: ListagemOptions,
    params: { pagina: number; por_pagina: number },
    filtro?: Record<string, string | string[]>,
    ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
  ) {
    const { data, total } = await recorrenciaFinanceiraRepository.findByFamiliaComFiltros(
      familiaId,
      filtros,
      options,
    );
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const recorrencia = await recorrenciaFinanceiraRepository.findDetalhada(id);
    if (!recorrencia || recorrencia.familiaId !== familiaId) {
      throw new AppError('Recorrencia nao encontrada', 404);
    }

    const ocorrenciasRecentes = await prisma.lancamento.findMany({
      where: { recorrenciaId: id },
      orderBy: { dataHora: 'desc' },
      take: 5,
      select: {
        id: true,
        titulo: true,
        valor: true,
        moeda: true,
        status: true,
        dataHora: true,
      },
    });

    return { ...recorrencia, ocorrenciasRecentes };
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarRecorrenciaFinanceiraDTO) {
    const existente = await recorrenciaFinanceiraRepository.findById(id);
    if (!existente || existente.familiaId !== familiaId) {
      throw new AppError('Recorrencia nao encontrada', 404);
    }

    const dados: AtualizarRecorrenciaFinanceiraDTO = { ...dto };
    if (dados.proximaExecucao !== undefined) {
      dados.proximaExecucao = new Date(dados.proximaExecucao).toISOString();
    }

    return recorrenciaFinanceiraRepository.update(id, dados);
  }

  async alterarStatus(familiaId: string, id: string, ativa: boolean) {
    const existente = await recorrenciaFinanceiraRepository.findById(id);
    if (!existente || existente.familiaId !== familiaId) {
      throw new AppError('Recorrencia nao encontrada', 404);
    }

    return recorrenciaFinanceiraRepository.update(id, { ativa });
  }

  async remover(familiaId: string, id: string) {
    const existente = await recorrenciaFinanceiraRepository.findById(id);
    if (!existente || existente.familiaId !== familiaId) {
      throw new AppError('Recorrencia nao encontrada', 404);
    }

    await recorrenciaFinanceiraRepository.delete(id);
  }

  // ==================== PROCESSAMENTO ====================

  /**
   * Encontra recorrencias ativas com proximaExecucao no passado e gera as
   * ocorrencias pendentes de forma deterministica (idempotente). Uma recorrencia
   * e processada inteiramente dentro de uma transacao: gera as ocorrencias
   * atrasadas e atualiza ultimaExecucao/proximaExecucao, ou nada e persistido.
   */
  async processarExecucoesPendentes(agora: Date) {
    const pendentes = await recorrenciaFinanceiraRepository.findPendentes(agora);
    const resumo = { processadas: 0, geradas: 0 };

    for (const recorrencia of pendentes) {
      const resultado = await prisma.$transaction(async (tx) => {
        const modeloRaw = recorrencia.lancamentoModelo as unknown as ModeloLancamento | null;
        if (!modeloRaw) return { geradas: 0 };
        const modelo = normalizarModelo(modeloRaw);
        if (!modelo) return { geradas: 0 };

        let dataAtual = new Date(recorrencia.proximaExecucao);
        let ultimaExecucao: Date | null = recorrencia.ultimaExecucao
          ? new Date(recorrencia.ultimaExecucao)
          : null;
        let geradas = 0;

        while (dataAtual <= agora && geradas < MAX_OCORRENCIAS_POR_EXECUCAO) {
          const duplicada = await recorrenciaFinanceiraRepository.existsOcorrenciaIn(
            tx,
            recorrencia.id,
            dataAtual,
          );
          if (!duplicada) {
            await lancamentoService.criarDeRecorrencia(
              tx,
              recorrencia.familiaId,
              modelo,
              dataAtual,
              recorrencia.id,
            );
            ultimaExecucao = dataAtual;
            geradas++;
          }

          dataAtual = calcularProximaExecucao(
            recorrencia.frequencia,
            recorrencia.intervalo,
            dataAtual,
          );
        }

        if (dataAtual >= new Date(recorrencia.proximaExecucao)) {
          await recorrenciaFinanceiraRepository.updateIn(tx, recorrencia.id, {
            proximaExecucao: dataAtual,
            ultimaExecucao,
          });
        }

        return { geradas };
      });

      resumo.processadas++;
      resumo.geradas += resultado.geradas;
    }

    return resumo;
  }

  /**
   * Gera manualmente a proxima ocorrencia agendada da recorrencia.
   * Idempotente: se a ocorrencia de proximaExecucao ja existir, apenas avanca
   * o ciclo sem duplicar. Nao quebra o ciclo normal da recorrencia.
   */
  async executarManual(familiaId: string, id: string) {
    const recorrencia = await recorrenciaFinanceiraRepository.findComModelo(id);
    if (!recorrencia || recorrencia.familiaId !== familiaId) {
      throw new AppError('Recorrencia nao encontrada', 404);
    }
    if (!recorrencia.ativa) {
      throw new AppError('Recorrencia inativa', 400);
    }

    const modelo = normalizarModelo(recorrencia.lancamentoModelo as unknown as ModeloLancamento);
    if (!modelo) {
      throw new AppError('Lancamento modelo nao encontrado', 404);
    }

    const dataExecucao = new Date(recorrencia.proximaExecucao);

    const resultado = await prisma.$transaction(async (tx) => {
      const duplicada = await recorrenciaFinanceiraRepository.existsOcorrenciaIn(
        tx,
        id,
        dataExecucao,
      );

      let gerada = false;
      if (!duplicada) {
        await lancamentoService.criarDeRecorrencia(
          tx,
          recorrencia.familiaId,
          modelo,
          dataExecucao,
          id,
        );
        gerada = true;
      }

      const proxima = calcularProximaExecucao(
        recorrencia.frequencia,
        recorrencia.intervalo,
        dataExecucao,
      );
      await recorrenciaFinanceiraRepository.updateIn(tx, id, {
        proximaExecucao: proxima,
        ultimaExecucao: dataExecucao,
      });

      return { gerada };
    });

    return {
      recorrenciaId: id,
      gerada: resultado.gerada,
      proximaExecucao: await this.obterProximaExecucao(id),
    };
  }

  async listarOcorrencias(
    familiaId: string,
    recorrenciaId: string,
    options: ListagemOptions,
    params: { pagina: number; por_pagina: number },
    filtro?: Record<string, string | string[]>,
    ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
  ) {
    const recorrencia = await recorrenciaFinanceiraRepository.findById(recorrenciaId);
    if (!recorrencia || recorrencia.familiaId !== familiaId) {
      throw new AppError('Recorrencia nao encontrada', 404);
    }

    const { data, total } = await recorrenciaFinanceiraRepository.listarOcorrencias(
      familiaId,
      recorrenciaId,
      options,
    );
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  private async obterProximaExecucao(id: string): Promise<string> {
    const r = await recorrenciaFinanceiraRepository.findById(id);
    return r ? r.proximaExecucao.toISOString() : '';
  }
}

export const recorrenciaFinanceiraService = new RecorrenciaFinanceiraService();
