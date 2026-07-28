import { tagRepository } from '../../repositories/financeiro/tag.repository';
import { CriarTagDTO, AtualizarTagDTO } from '../../models/financeiro/tag.model';
import { AppError } from '../auth.service';
import { ListagemOptions, paginatedResponse } from '../../helpers/listagem.helper';

export class TagService {
  async criar(familiaId: string, dto: CriarTagDTO) {
    const existente = await tagRepository.findByFamiliaAndNome(familiaId, dto.nome);
    if (existente) {
      throw new AppError('Ja existe uma tag com este nome nesta familia', 409);
    }
    return tagRepository.create(familiaId, dto);
  }

  async listar(familiaId: string, options: ListagemOptions, params: { pagina: number; por_pagina: number }, filtro?: Record<string, string | string[]>, ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[]) {
    const { data, total } = await tagRepository.findByFamiliaWithFilters(familiaId, options);
    return paginatedResponse(data, total, options, params, filtro, ordenacao);
  }

  async obter(familiaId: string, id: string) {
    const tag = await tagRepository.findById(id);
    if (!tag || tag.familiaId !== familiaId) {
      throw new AppError('Tag nao encontrada', 404);
    }
    return tag;
  }

  async atualizar(familiaId: string, id: string, dto: AtualizarTagDTO) {
    const tag = await tagRepository.findById(id);
    if (!tag || tag.familiaId !== familiaId) {
      throw new AppError('Tag nao encontrada', 404);
    }

    if (dto.nome && dto.nome !== tag.nome) {
      const existente = await tagRepository.findByFamiliaAndNome(familiaId, dto.nome);
      if (existente) {
        throw new AppError('Ja existe uma tag com este nome nesta familia', 409);
      }
    }

    return tagRepository.update(id, dto);
  }

  async remover(familiaId: string, id: string) {
    const tag = await tagRepository.findById(id);
    if (!tag || tag.familiaId !== familiaId) {
      throw new AppError('Tag nao encontrada', 404);
    }

    const totalLancamentos = await tagRepository.countLancamentos(id);
    if (totalLancamentos > 0) {
      throw new AppError('Nao e possivel excluir tag com lancamentos vinculados', 400);
    }

    return tagRepository.delete(id);
  }
}

export const tagService = new TagService();
