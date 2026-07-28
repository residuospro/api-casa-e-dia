import prisma from '../../config/database';
import { CriarCategoriaFinanceiraDTO, AtualizarCategoriaFinanceiraDTO } from '../../models/financeiro/categoria-financeira.model';
import { ListagemOptions, buildWhereClause, buildOrderBy } from '../../helpers/listagem.helper';

export const categoriaFinanceiraRepository = {
  create(familiaId: string, data: CriarCategoriaFinanceiraDTO) {
    return prisma.categoriaFinanceira.create({
      data: {
        familiaId,
        nome: data.nome,
        icone: data.icone ?? null,
        cor: data.cor ?? null,
        tipo: data.tipo,
      },
    });
  },

  findById(id: string) {
    return prisma.categoriaFinanceira.findUnique({ where: { id } });
  },

  findByFamilia(familiaId: string, incluirArquivadas = false) {
    return prisma.categoriaFinanceira.findMany({
      where: {
        familiaId,
        ...(incluirArquivadas ? {} : { status: 'ATIVA' }),
      },
      include: { subcategorias: { where: { ativo: true }, orderBy: { nome: 'asc' } } },
      orderBy: { nome: 'asc' },
    });
  },

  async findByFamiliaWithFilters(familiaId: string, options: ListagemOptions, incluirArquivadas = false) {
    const baseWhere: Record<string, unknown> = { familiaId };
    if (!incluirArquivadas) {
      baseWhere.status = 'ATIVA';
    }
    const where = buildWhereClause(baseWhere, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.categoriaFinanceira.findMany({
        where,
        include: { subcategorias: { where: { ativo: true }, orderBy: { nome: 'asc' } } },
        orderBy,
        skip,
        take: options.porPagina,
      }),
      prisma.categoriaFinanceira.count({ where }),
    ]);

    return { data, total };
  },

  findAtivasByFamilia(familiaId: string) {
    return prisma.categoriaFinanceira.findMany({
      where: { familiaId, status: 'ATIVA' },
      orderBy: { nome: 'asc' },
    });
  },

  findByFamiliaAndNome(familiaId: string, nome: string) {
    return prisma.categoriaFinanceira.findFirst({ where: { familiaId, nome } });
  },

  update(id: string, data: AtualizarCategoriaFinanceiraDTO) {
    return prisma.categoriaFinanceira.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.categoriaFinanceira.delete({ where: { id } });
  },

  countLancamentos(id: string) {
    return prisma.lancamento.count({ where: { categoriaId: id } });
  },
};
