import prisma from '../../config/database';
import { CriarCartaoDTO, AtualizarCartaoDTO } from '../../models/financeiro/cartao.model';
import { ListagemOptions, buildWhereClause, buildOrderBy } from '../../helpers/listagem.helper';

export const cartaoRepository = {
  create(familiaId: string, data: CriarCartaoDTO) {
    return prisma.cartao.create({
      data: {
        familiaId,
        contaId: data.contaId,
        nome: data.nome,
        tipo: data.tipo ?? 'CREDITO',
        bandeira: data.bandeira ?? null,
        limite: data.limite ?? null,
        fechamentoDia: data.fechamentoDia ?? null,
        vencimentoDia: data.vencimentoDia ?? null,
        melhorDiaCompra: data.melhorDiaCompra ?? null,
      },
    });
  },

  findById(id: string) {
    return prisma.cartao.findUnique({ where: { id } });
  },

  findByFamilia(familiaId: string) {
    return prisma.cartao.findMany({
      where: { familiaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async findByFamiliaWithFilters(familiaId: string, options: ListagemOptions) {
    const where = buildWhereClause({ familiaId }, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.cartao.findMany({ where, orderBy, skip, take: options.porPagina }),
      prisma.cartao.count({ where }),
    ]);

    return { data, total };
  },

  update(id: string, data: AtualizarCartaoDTO) {
    return prisma.cartao.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.cartao.delete({ where: { id } });
  },

  countLancamentos(id: string) {
    return prisma.lancamento.count({ where: { cartaoId: id } });
  },
};
