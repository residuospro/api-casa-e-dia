export interface ListagemOptions {
  filtro?: Record<string, string | string[]>;
  ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[];
  pagina: number;
  porPagina: number;
}

export interface ListagemParams {
  pagina: number;
  por_pagina: number;
}

export function parseListagemQuery(query: Record<string, unknown>): {
  options: ListagemOptions;
  params: ListagemParams;
} {
  const queryPaginacao = query.paginacao as Record<string, string> | undefined;
  const rawPagina = queryPaginacao?.pagina ?? query.pagina ?? query.page;
  const rawPorPagina = queryPaginacao?.por_pagina ?? query.por_pagina ?? query.porPagina;
  const filtro = query.filtro as Record<string, string | string[]> | undefined;
  const ordenacao = query.ordenacao as { coluna: string; direcao: 'asc' | 'desc' }[] | undefined;

  const pagina = Math.max(1, Number(rawPagina) || 1);
  const porPagina = Math.min(100, Math.max(1, Number(rawPorPagina) || 10));

  return {
    options: {
      filtro,
      ordenacao: Array.isArray(ordenacao) ? ordenacao : undefined,
      pagina,
      porPagina,
    },
    params: {
      pagina: Number(rawPagina) || 1,
      por_pagina: Number(rawPorPagina) || 10,
    },
  };
}

export function buildWhereClause(
  baseWhere: Record<string, unknown>,
  filtro?: Record<string, string | string[]>,
): Record<string, unknown> {
  const where = { ...baseWhere };

  if (!filtro) return where;

  for (const [key, value] of Object.entries(filtro)) {
    if (!value || (Array.isArray(value) && value.length === 0)) continue;

    const arrValue = Array.isArray(value) ? value : [value];

    if (key === 'busca') {
      where.OR = [
        { nome: { contains: arrValue[0], mode: 'insensitive' } },
      ];
    } else if (key === 'ativo') {
      where[key] = arrValue[0] === 'true';
    } else {
      where[key] = arrValue.length === 1 ? arrValue[0] : { in: arrValue };
    }
  }

  return where;
}

export function buildOrderBy(
  ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
  defaultColumn = 'criadoEm',
): Record<string, string>[] {
  if (ordenacao && ordenacao.length > 0) {
    return ordenacao.map((o) => ({ [o.coluna]: o.direcao }));
  }
  return [{ [defaultColumn]: 'desc' }];
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  options: ListagemOptions,
  params: ListagemParams,
  filtro?: Record<string, string | string[]>,
  ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[],
) {
  const ultimaPagina = Math.ceil(total / options.porPagina);

  return {
    filtro: filtro ?? {},
    ordenacao: ordenacao ?? [{ coluna: 'criadoEm', direcao: 'desc' }],
    paginacao: {
      total: ultimaPagina,
      pagina: params.pagina,
      por_pagina: params.por_pagina,
      ultima_pagina: ultimaPagina,
    },
    data,
  };
}
