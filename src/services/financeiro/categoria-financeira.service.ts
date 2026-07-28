import { categoriaFinanceiraRepository } from '../../repositories/financeiro/categoria-financeira.repository';
import { CriarCategoriaFinanceiraDTO, AtualizarCategoriaFinanceiraDTO } from '../../models/financeiro/categoria-financeira.model';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';

export class CategoriaFinanceiraService {
  async criar(familiaId: string, dto: CriarCategoriaFinanceiraDTO) {
    const existente = await categoriaFinanceiraRepository.findByFamiliaAndNome(familiaId, dto.nome);
    if (existente) {
      throw new AppError('Ja existe uma categoria com este nome nesta familia', 409);
    }
    return categoriaFinanceiraRepository.create(familiaId, dto);
  }

  async listar(familiaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[], incluirArquivadas = false) {
    const { data, total } = await categoriaFinanceiraRepository.findByFamiliaWithFilters(familiaId, options, incluirArquivadas);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async listarAtivas(familiaId: string) {
    return categoriaFinanceiraRepository.findAtivasByFamilia(familiaId);
  }

  async obter(familiaId: string, id: string) {
    const categoria = await categoriaFinanceiraRepository.findById(id);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Categoria nao encontrada', 404);
    }
    return categoria;
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarCategoriaFinanceiraDTO) {
    const categoria = await categoriaFinanceiraRepository.findById(id);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Categoria nao encontrada', 404);
    }

    if (dto.nome && dto.nome !== categoria.nome) {
      const existente = await categoriaFinanceiraRepository.findByFamiliaAndNome(familiaId, dto.nome);
      if (existente) {
        throw new AppError('Ja existe uma categoria com este nome nesta familia', 409);
      }
    }

    return categoriaFinanceiraRepository.update(id, dto);
  }

  async remover(familiaId: string, id: string) {
    const categoria = await categoriaFinanceiraRepository.findById(id);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Categoria nao encontrada', 404);
    }

    const totalLancamentos = await categoriaFinanceiraRepository.countLancamentos(id);
    if (totalLancamentos > 0) {
      throw new AppError('Nao e possivel excluir categoria com lancamentos vinculados', 400);
    }

    return categoriaFinanceiraRepository.delete(id);
  }
}

export const categoriaFinanceiraService = new CategoriaFinanceiraService();
