import { cartaoRepository } from '../../repositories/financeiro/cartao.repository';
import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { CriarCartaoDTO, AtualizarCartaoDTO } from '../../models/financeiro/cartao.model';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';

export class CartaoService {
  async criar(familiaId: string, dto: CriarCartaoDTO) {
    const conta = await contaRepository.findById(dto.contaId);
    if (!conta || conta.familiaId !== familiaId) {
      throw new AppError('Conta nao encontrada nesta familia', 404);
    }
    return cartaoRepository.create(familiaId, dto);
  }

  async listar(familiaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const { data, total } = await cartaoRepository.findByFamiliaWithFilters(familiaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const cartao = await cartaoRepository.findById(id);
    if (!cartao || cartao.familiaId !== familiaId) {
      throw new AppError('Cartao nao encontrado', 404);
    }
    return cartao;
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarCartaoDTO) {
    const cartao = await cartaoRepository.findById(id);
    if (!cartao || cartao.familiaId !== familiaId) {
      throw new AppError('Cartao nao encontrado', 404);
    }

    if (dto.contaId) {
      const conta = await contaRepository.findById(dto.contaId);
      if (!conta || conta.familiaId !== familiaId) {
        throw new AppError('Conta nao encontrada nesta familia', 404);
      }
    }

    return cartaoRepository.update(id, dto);
  }

  async remover(familiaId: string, id: string) {
    const cartao = await cartaoRepository.findById(id);
    if (!cartao || cartao.familiaId !== familiaId) {
      throw new AppError('Cartao nao encontrado', 404);
    }

    const totalLancamentos = await cartaoRepository.countLancamentos(id);
    if (totalLancamentos > 0) {
      throw new AppError('Nao e possivel excluir cartao com lancamentos vinculados', 400);
    }

    return cartaoRepository.delete(id);
  }
}

export const cartaoService = new CartaoService();
