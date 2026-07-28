import prisma from '../../config/database';
import { CriarCentroCustoFinanceiroDTO, AtualizarCentroCustoFinanceiroDTO } from '../../models/financeiro/centro-custo-financeiro.model';
import { ListagemOptions, buildWhereClause, buildOrderBy } from '../../helpers/listagem.helper';

export const centroCustoRepository = {
  create(familiaId: string, data: CriarCentroCustoFinanceiroDTO) {
    return prisma.centroCustoFinanceiro.create({
      data: {
        familiaId,
        nome: data.nome,
        icone: data.icone ?? null,
        cor: data.cor ?? null,
      },
    });
  },

  findById(id: string) {
    return prisma.centroCustoFinanceiro.findUnique({ where: { id } });
  },

  findByFamilia(familiaId: string) {
    return prisma.centroCustoFinanceiro.findMany({
      where: { familiaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async findByFamiliaWithFilters(familiaId: string, options: ListagemOptions) {
    const where = buildWhereClause({ familiaId, ativo: true }, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.centroCustoFinanceiro.findMany({ where, orderBy, skip, take: options.porPagina }),
      prisma.centroCustoFinanceiro.count({ where }),
    ]);

    return { data, total };
  },

  findByFamiliaAndNome(familiaId: string, nome: string) {
    return prisma.centroCustoFinanceiro.findFirst({ where: { familiaId, nome } });
  },

  update(id: string, data: AtualizarCentroCustoFinanceiroDTO) {
    return prisma.centroCustoFinanceiro.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.centroCustoFinanceiro.delete({ where: { id } });
  },

  countLancamentos(id: string) {
    return prisma.lancamento.count({ where: { centroCustoId: id } });
  },
};
