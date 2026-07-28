import prisma from '../../config/database';
import { CriarTagDTO, AtualizarTagDTO } from '../../models/financeiro/tag.model';
import { ListagemOptions, buildWhereClause, buildOrderBy } from '../../helpers/listagem.helper';

export const tagRepository = {
  create(familiaId: string, data: CriarTagDTO) {
    return prisma.tag.create({
      data: { familiaId, nome: data.nome, cor: data.cor ?? null },
    });
  },

  findById(id: string) {
    return prisma.tag.findUnique({ where: { id } });
  },

  findByFamilia(familiaId: string) {
    return prisma.tag.findMany({
      where: { familiaId },
      orderBy: { nome: 'asc' },
    });
  },

  async findByFamiliaWithFilters(familiaId: string, options: ListagemOptions) {
    const where = buildWhereClause({ familiaId }, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.tag.findMany({ where, orderBy, skip, take: options.porPagina }),
      prisma.tag.count({ where }),
    ]);

    return { data, total };
  },

  findByFamiliaAndNome(familiaId: string, nome: string) {
    return prisma.tag.findFirst({ where: { familiaId, nome } });
  },

  update(id: string, data: AtualizarTagDTO) {
    return prisma.tag.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.tag.delete({ where: { id } });
  },

  countLancamentos(id: string) {
    return prisma.lancamentoTag.count({ where: { tagId: id } });
  },
};
