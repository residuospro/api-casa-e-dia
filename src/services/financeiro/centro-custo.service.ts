import { centroCustoRepository } from '../../repositories/financeiro/centro-custo.repository';
import { CriarCentroCustoFinanceiroDTO, AtualizarCentroCustoFinanceiroDTO } from '../../models/financeiro/centro-custo-financeiro.model';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';

export class CentroCustoService {
  async criar(familiaId: string, dto: CriarCentroCustoFinanceiroDTO) {
    const existente = await centroCustoRepository.findByFamiliaAndNome(familiaId, dto.nome);
    if (existente) {
      throw new AppError('Ja existe um centro de custo com este nome nesta familia', 409);
    }
    return centroCustoRepository.create(familiaId, dto);
  }

  async listar(familiaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const { data, total } = await centroCustoRepository.findByFamiliaWithFilters(familiaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const centroCusto = await centroCustoRepository.findById(id);
    if (!centroCusto || centroCusto.familiaId !== familiaId) {
      throw new AppError('Centro de custo nao encontrado', 404);
    }
    return centroCusto;
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarCentroCustoFinanceiroDTO) {
    const centroCusto = await centroCustoRepository.findById(id);
    if (!centroCusto || centroCusto.familiaId !== familiaId) {
      throw new AppError('Centro de custo nao encontrado', 404);
    }

    if (dto.nome && dto.nome !== centroCusto.nome) {
      const existente = await centroCustoRepository.findByFamiliaAndNome(familiaId, dto.nome);
      if (existente) {
        throw new AppError('Ja existe um centro de custo com este nome nesta familia', 409);
      }
    }

    return centroCustoRepository.update(id, dto);
  }

  async remover(familiaId: string, id: string) {
    const centroCusto = await centroCustoRepository.findById(id);
    if (!centroCusto || centroCusto.familiaId !== familiaId) {
      throw new AppError('Centro de custo nao encontrado', 404);
    }

    const totalLancamentos = await centroCustoRepository.countLancamentos(id);
    if (totalLancamentos > 0) {
      throw new AppError('Nao e possivel excluir centro de custo com lancamentos vinculados', 400);
    }

    return centroCustoRepository.delete(id);
  }
}

export const centroCustoService = new CentroCustoService();
