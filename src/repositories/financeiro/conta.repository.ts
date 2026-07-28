import prisma from '../../config/database';
import { CriarContaDTO, AtualizarContaDTO } from '../../models/financeiro/conta.model';
import { ListagemOptions, buildWhereClause, buildOrderBy } from '../../helpers/listagem.helper';

const contaInclude = {
  cartoes: { select: { id: true, nome: true } },
  _count: { select: { lancamentosOrigem: true, lancamentosDestino: true } },
};

export const contaRepository = {
  create(familiaId: string, data: CriarContaDTO) {
    return prisma.conta.create({
      data: {
        familiaId,
        nome: data.nome,
        instituicao: data.instituicao ?? null,
        tipo: data.tipo,
        moeda: data.moeda ?? 'BRL',
        saldoInicial: data.saldoInicial ?? 0,
        saldoAtual: data.saldoInicial ?? 0,
        saldoPrevisto: data.saldoInicial ?? 0,
        cor: data.cor ?? null,
        icone: data.icone ?? null,
      },
    });
  },

  findById(id: string) {
    return prisma.conta.findUnique({ where: { id } });
  },

  findByFamilia(familiaId: string) {
    return prisma.conta.findMany({
      where: { familiaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async findByFamiliaWithFilters(familiaId: string, options: ListagemOptions) {
    const where = buildWhereClause({ familiaId, ativo: true }, options.filtro);
    const orderBy = buildOrderBy(options.ordenacao, 'nome');
    const skip = (options.pagina - 1) * options.porPagina;

    const [data, total] = await Promise.all([
      prisma.conta.findMany({ where, orderBy, skip, take: options.porPagina }),
      prisma.conta.count({ where }),
    ]);

    return { data, total };
  },

  findWithDetails(id: string) {
    return prisma.conta.findUnique({ where: { id }, include: contaInclude });
  },

  update(id: string, data: AtualizarContaDTO) {
    return prisma.conta.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.conta.delete({ where: { id } });
  },

  countLancamentos(id: string) {
    return prisma.lancamento.count({
      where: {
        OR: [{ contaOrigemId: id }, { contaDestinoId: id }],
      },
    });
  },
};
