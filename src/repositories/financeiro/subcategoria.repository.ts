import prisma from '../../config/database';
import { CriarSubcategoriaDTO, AtualizarSubcategoriaDTO } from '../../models/financeiro/subcategoria.model';
import { ListagemOptions, buildWhereClause, buildOrderBy } from '../../helpers/listagem.helper';

export const subcategoriaRepository = {
  create(categoriaId: string, data: CriarSubcategoriaDTO) {
    return prisma.subcategoria.create({
      data: { categoriaId, nome: data.nome },
    });
  },

  findById(id: string) {
    return prisma.subcategoria.findUnique({ where: { id } });
  },

  findByCategoria(categoriaId: string) {
    return prisma.subcategoria.findMany({
      where: { categoriaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async findByCategoriaWithFilters(categoriaId: string, options: ListagemOptions) {
    const where = buildWhereClause({ categoriaId, ativo: true }, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.subcategoria.findMany({ where, orderBy, skip, take: options.porPagina }),
      prisma.subcategoria.count({ where }),
    ]);

    return { data, total };
  },

  async findByFamiliaWithFilters(familiaId: string, options: ListagemOptions) {
    const baseWhere: Record<string, unknown> = {
      categoria: { familiaId },
    };
    const where = buildWhereClause(baseWhere, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.subcategoria.findMany({
        where,
        orderBy,
        skip,
        take: options.porPagina,
        include: { categoria: { select: { id: true, nome: true } } },
      }),
      prisma.subcategoria.count({ where }),
    ]);

    return { data, total };
  },

  findByCategoriaAndNome(categoriaId: string, nome: string) {
    return prisma.subcategoria.findFirst({ where: { categoriaId, nome } });
  },

  update(id: string, data: AtualizarSubcategoriaDTO) {
    return prisma.subcategoria.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.subcategoria.delete({ where: { id } });
  },

  countLancamentos(id: string) {
    return prisma.lancamento.count({ where: { subcategoriaId: id } });
  },
};
