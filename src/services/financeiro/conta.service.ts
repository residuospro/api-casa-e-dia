import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { CriarContaDTO, AtualizarContaDTO } from '../../models/financeiro/conta.model';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';

export class ContaService {
  async criar(familiaId: string, dto: CriarContaDTO) {
    return contaRepository.create(familiaId, dto);
  }

  async listar(familiaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const { data, total } = await contaRepository.findByFamiliaWithFilters(familiaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const conta = await contaRepository.findById(id);
    if (!conta || conta.familiaId !== familiaId) {
      throw new AppError('Conta nao encontrada', 404);
    }
    return conta;
  }

  async obterComDetalhes(familiaId: string, id: string) {
    const conta = await contaRepository.findWithDetails(id);
    if (!conta || conta.familiaId !== familiaId) {
      throw new AppError('Conta nao encontrada', 404);
    }
    return conta;
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarContaDTO) {
    const conta = await contaRepository.findById(id);
    if (!conta || conta.familiaId !== familiaId) {
      throw new AppError('Conta nao encontrada', 404);
    }
    return contaRepository.update(id, dto);
  }

  async remover(familiaId: string, id: string) {
    const conta = await contaRepository.findById(id);
    if (!conta || conta.familiaId !== familiaId) {
      throw new AppError('Conta nao encontrada', 404);
    }

    const totalLancamentos = await contaRepository.countLancamentos(id);
    if (totalLancamentos > 0) {
      throw new AppError('Nao e possivel excluir conta com lancamentos vinculados', 400);
    }

    return contaRepository.delete(id);
  }
}

export const contaService = new ContaService();
