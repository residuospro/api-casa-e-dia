import { subcategoriaRepository } from '../../repositories/financeiro/subcategoria.repository';
import { categoriaFinanceiraRepository } from '../../repositories/financeiro/categoria-financeira.repository';
import { CriarSubcategoriaDTO, AtualizarSubcategoriaDTO } from '../../models/financeiro/subcategoria.model';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';

export class SubcategoriaService {
  async criar(familiaId: string, dto: CriarSubcategoriaDTO) {
    const categoria = await categoriaFinanceiraRepository.findById(dto.categoriaId);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Categoria nao encontrada nesta familia', 404);
    }

    const existente = await subcategoriaRepository.findByCategoriaAndNome(dto.categoriaId, dto.nome);
    if (existente) {
      throw new AppError('Ja existe uma subcategoria com este nome nesta categoria', 409);
    }

    return subcategoriaRepository.create(dto.categoriaId, dto);
  }

  async listar(familiaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const { data, total } = await subcategoriaRepository.findByFamiliaWithFilters(familiaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async listarPorCategoria(familiaId: string, categoriaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const categoria = await categoriaFinanceiraRepository.findById(categoriaId);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Categoria nao encontrada', 404);
    }
    const { data, total } = await subcategoriaRepository.findByCategoriaWithFilters(categoriaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const subcategoria = await subcategoriaRepository.findById(id);
    if (!subcategoria) {
      throw new AppError('Subcategoria nao encontrada', 404);
    }

    const categoria = await categoriaFinanceiraRepository.findById(subcategoria.categoriaId);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Subcategoria nao encontrada', 404);
    }

    return subcategoria;
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarSubcategoriaDTO) {
    const subcategoria = await subcategoriaRepository.findById(id);
    if (!subcategoria) {
      throw new AppError('Subcategoria nao encontrada', 404);
    }

    const categoria = await categoriaFinanceiraRepository.findById(subcategoria.categoriaId);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Subcategoria nao encontrada', 404);
    }

    if (dto.nome && dto.nome !== subcategoria.nome) {
      const existente = await subcategoriaRepository.findByCategoriaAndNome(subcategoria.categoriaId, dto.nome);
      if (existente) {
        throw new AppError('Ja existe uma subcategoria com este nome nesta categoria', 409);
      }
    }

    return subcategoriaRepository.update(id, dto);
  }

  async remover(familiaId: string, id: string) {
    const subcategoria = await subcategoriaRepository.findById(id);
    if (!subcategoria) {
      throw new AppError('Subcategoria nao encontrada', 404);
    }

    const categoria = await categoriaFinanceiraRepository.findById(subcategoria.categoriaId);
    if (!categoria || categoria.familiaId !== familiaId) {
      throw new AppError('Subcategoria nao encontrada', 404);
    }

    const totalLancamentos = await subcategoriaRepository.countLancamentos(id);
    if (totalLancamentos > 0) {
      throw new AppError('Nao e possivel excluir subcategoria com lancamentos vinculados', 400);
    }

    return subcategoriaRepository.delete(id);
  }
}

export const subcategoriaService = new SubcategoriaService();
