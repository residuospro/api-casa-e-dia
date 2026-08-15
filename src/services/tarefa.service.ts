import { tarefaRepository } from '../repositories/tarefa.repository';
import { familyRepository } from '../repositories/family.repository';
import { cicloRepository } from '../repositories/ciclo.repository';
import { AppError } from './auth.service';
import { TipoTarefa, ModoDistribuicao, StatusExecucao, NotificacaoTipo, FrequenciaRecorrencia, Categoria } from '../models/enums';
import {
  CriarTarefaDTO,
  AtualizarTarefaDTO,
  Recorrencia,
} from '../models/tarefa.model';
import { notificationService } from './notification.service';

export async function renovarExecucoesTarefa(
  tarefaId: string,
  iteracao: number | null,
  novoInicio: Date,
  duracaoDias: number,
) {
  const execucoes = await tarefaRepository.findExecucoesByTarefa(tarefaId);

  const naoCanceladas = execucoes.filter((e) => e.status !== 'CANCELADA');

  const iteracaoAnterior = iteracao != null ? iteracao - 1 : null;
  const temIteracaoInformada = naoCanceladas.some((e) => e.iteracao != null);

  const base = iteracaoAnterior != null && temIteracaoInformada
    ? naoCanceladas.filter((e) => e.iteracao === iteracaoAnterior)
    : naoCanceladas;

  const novas: { data: Date; status: string; iteracao?: number | null }[] = [];

  if (base.length === 0) {
    novas.push({ data: new Date(novoInicio), status: 'AGENDADA', iteracao });
  } else {
    for (const exec of base) {
      const data = new Date(exec.data.getTime() + duracaoDias * 24 * 60 * 60 * 1000);
      novas.push({ data, status: 'AGENDADA', iteracao });
    }
  }

  await tarefaRepository.createExecucoes(tarefaId, novas);
}

function diaDoMes(data: Date): number {
  return data.getDate();
}

function diaDoMesEhPar(data: Date): boolean {
  return diaDoMes(data) % 2 === 0;
}

function diaDoMesEhImpar(data: Date): boolean {
  return diaDoMes(data) % 2 !== 0;
}

function ehDiaSimDiaNao(dataInicio: Date, dataAtual: Date): boolean {
  const diffMs = dataAtual.getTime() - dataInicio.getTime();
  const diffDias = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return diffDias % 2 !== 0;
}

function parseHorario(horario: string, data: Date): Date {
  const [horas, minutos] = horario.split(':').map(Number);
  const resultado = new Date(data);
  resultado.setHours(horas, minutos, 0, 0);
  return resultado;
}

export function gerarExecucoesRecorrentes(
  recorrencia: Recorrencia,
  dataRef?: Date,
  diasAFrente: number = 7,
): { data: Date; status: StatusExecucao }[] {
  const hoje = dataRef ?? new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioRef = recorrencia.dataInicio ? new Date(recorrencia.dataInicio) : new Date(hoje);
  inicioRef.setHours(0, 0, 0, 0);

  const inicioIteracao = new Date(Math.max(hoje.getTime(), inicioRef.getTime()));

  const fim = new Date(inicioIteracao);
  fim.setDate(fim.getDate() + diasAFrente);

  if (recorrencia.dataFim) {
    const dataFim = new Date(recorrencia.dataFim);
    if (dataFim < fim) {
      fim.setTime(dataFim.getTime());
    }
  }

  const execucoes: { data: Date; status: StatusExecucao }[] = [];
  const atual = new Date(inicioIteracao);

  while (atual <= fim) {
    let deveGerar = false;

    switch (recorrencia.frequencia) {
      case FrequenciaRecorrencia.DIARIO:
        deveGerar = true;
        break;
      case FrequenciaRecorrencia.DIA_SIM_DIA_NAO:
        deveGerar = ehDiaSimDiaNao(inicioRef, atual);
        break;
      case FrequenciaRecorrencia.DIAS_IMPARES:
        deveGerar = diaDoMesEhImpar(atual);
        break;
      case FrequenciaRecorrencia.DIAS_PARES:
        deveGerar = diaDoMesEhPar(atual);
        break;
    }

    if (deveGerar) {
      for (const horario of recorrencia.horarios) {
        execucoes.push({
          data: parseHorario(horario, atual),
          status: StatusExecucao.AGENDADA,
        });
      }
    }

    atual.setDate(atual.getDate() + 1);
  }

  return execucoes;
}

function calcularDataLimiteInferiorCiclo(ciclo: { inicio: Date; renovadoEm: Date | null }): Date {
  return ciclo.renovadoEm
    ? new Date(ciclo.renovadoEm)
    : new Date(ciclo.inicio);
}

function validarDatasExecucoes(
  execucoes: { data: Date }[],
  ciclo: { inicio: Date; renovadoEm: Date | null; proximaRenovacao: Date | null } | null,
): void {
  if (!execucoes || execucoes.length === 0) return;

  const agora = new Date();

  for (const execucao of execucoes) {
    if (ciclo) {
      const limiteInferior = calcularDataLimiteInferiorCiclo(ciclo);
      if (execucao.data < limiteInferior) {
        throw new AppError(
          `Execução com data anterior ${ciclo.renovadoEm ? 'à renovação' : 'ao início'} do ciclo`,
          400,
        );
      }

      if (ciclo.proximaRenovacao && execucao.data > new Date(ciclo.proximaRenovacao)) {
        throw new AppError('Execução com data após o vencimento do ciclo', 400);
      }
    } else {
      if (execucao.data < agora) {
        throw new AppError('Execução com data no passado', 400);
      }
    }
  }
}

function transformParticipantes(tarefa: any) {
  if (!tarefa.participantes || !Array.isArray(tarefa.participantes)) return tarefa;
  const participantesId = tarefa.participantes.map((pt: any) => pt.membroId).filter(Boolean);
  const { participantes, ...rest } = tarefa;
  return {
    ...rest,
    participantesId,
  };
}

function transformTarefa(tarefa: any) {
  return transformParticipantes(tarefa);
}

function atribuirExecucoes<T extends { data: Date; status?: any }>(
  execucoes: T[],
  responsavelId: string | null | undefined,
  participantes: string[] | null | undefined,
): (T & { executorId: string | null })[] {
  if (!responsavelId || !participantes || participantes.length === 0) {
    return execucoes.map((e) => ({ ...e, executorId: responsavelId ?? null }));
  }
  return execucoes.map((e, i) => {
    if (i % 2 === 0) {
      return { ...e, executorId: responsavelId };
    }
    const idx = Math.floor(i / 2) % participantes.length;
    return { ...e, executorId: participantes[idx] };
  });
}

export class TarefaService {
  async criar(dto: CriarTarefaDTO) {
    const familia = await familyRepository.findFamiliaById(dto.familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    if (dto.tipo === TipoTarefa.PESSOAL) {
      if (!dto.responsavelAtualId) {
        throw new AppError('Tarefa pessoal deve ter um responsável', 400);
      }
      dto.participantesId = null;
    }

    if (dto.participantesId && dto.participantesId.length > 0) {
      const membros = await familyRepository.findMembrosByFamilia(dto.familiaId);
      const membrosAtivos = new Set(
        membros.filter((m: any) => m.status === 'ACEITO').map((m: any) => m.id),
      );
      for (const membroId of dto.participantesId) {
        if (!membrosAtivos.has(membroId)) {
          throw new AppError(`Participante ${membroId} não é membro ativo desta família`, 400);
        }
      }
      const duplicados = dto.participantesId.filter((id, i) => dto.participantesId!.indexOf(id) !== i);
      if (duplicados.length > 0) {
        throw new AppError('Participantes duplicados não são permitidos', 400);
      }
    }

    let cicloRevezamento: Awaited<ReturnType<typeof cicloRepository.findById>> | null = null;

    if (dto.cicloId) {
      cicloRevezamento = await cicloRepository.findById(dto.cicloId);
      if (!cicloRevezamento) {
        throw new AppError('Ciclo não encontrado', 404);
      }
    }

    if (dto.tipo === TipoTarefa.FAMILIAR) {
      if (dto.modoDistribuicao === ModoDistribuicao.FIXA && !dto.responsavelAtualId) {
        throw new AppError('Tarefa fixa deve ter um responsável', 400);
      }

      if (dto.modoDistribuicao === ModoDistribuicao.REVEZAMENTO) {
        if (!dto.cicloId) {
          throw new AppError('Tarefa de revezamento deve ter um ciclo', 400);
        }
        if (!cicloRevezamento) {
          throw new AppError('Ciclo não encontrado', 404);
        }

        if (dto.atribuirAutomaticamente) {
          const participantes = cicloRevezamento.participantes;
          if (participantes.length === 0) {
            throw new AppError('Ciclo não possui participantes para atribuição automática', 400);
          }

          const membrosAtivos = await familyRepository.findMembrosAtivosByFamilia(dto.familiaId);
          const idsAtivos = new Set(membrosAtivos.map((m) => m.id));
          const participantesValidos = participantes.filter((p) => idsAtivos.has(p));

          if (participantesValidos.length === 0) {
            throw new AppError('Nenhum participante do ciclo é um membro ativo da família', 400);
          }

          const contagem = await tarefaRepository.countTarefasAtivasByCicloGroupByResponsavel(cicloRevezamento.id);
          const mapaContagem = new Map(contagem.map((c) => [c.responsavelAtualId!, c._count.id]));
          const menorCount = Math.min(...participantesValidos.map((p) => mapaContagem.get(p) ?? 0));
          const candidatos = participantesValidos.filter((p) => (mapaContagem.get(p) ?? 0) === menorCount);
          dto.responsavelAtualId = candidatos[Math.floor(Math.random() * candidatos.length)];
        }

        if (dto.responsavelAtualId && !cicloRevezamento.participantes.includes(dto.responsavelAtualId)) {
          throw new AppError('Responsável não faz parte do ciclo', 400);
        }

        if (dto.execucoes && dto.execucoes.length > 0) {
          const referencia = cicloRevezamento.proximaRenovacao
            ? new Date(cicloRevezamento.proximaRenovacao)
            : new Date(cicloRevezamento.inicio.getTime() + cicloRevezamento.duracaoDias * 24 * 60 * 60 * 1000);

          for (const execucao of dto.execucoes) {
            if (execucao.data > referencia) {
              throw new AppError('Execução com data após o vencimento do ciclo', 400);
            }
          }

          validarDatasExecucoes(
            dto.execucoes.map((e) => ({ data: e.data })),
            cicloRevezamento,
          );
        }
      }
    }

    let execucoesFinais = dto.execucoes;

    if (dto.recorrencia) {
      if (cicloRevezamento) {
        const limiteInferior = cicloRevezamento.renovadoEm
          ? new Date(cicloRevezamento.renovadoEm)
          : new Date(cicloRevezamento.inicio);

        const dataInicioRecorrencia = dto.recorrencia.dataInicio
          ? new Date(dto.recorrencia.dataInicio)
          : new Date();

        if (dataInicioRecorrencia < limiteInferior) {
          throw new AppError(
            `Recorrência com data anterior ${cicloRevezamento.renovadoEm ? 'à renovação' : 'ao início'} do ciclo`,
            400,
          );
        }
      }

      const geradas = gerarExecucoesRecorrentes(dto.recorrencia, undefined, 7);
      const agora = new Date();
      const futuras = geradas.filter((e) => e.data >= agora);
      validarDatasExecucoes(futuras, cicloRevezamento);
      execucoesFinais = futuras.map((e) => ({
        data: e.data,
        status: e.status,
        pontosObtidos: null,
      }));
    }

    const execucoesComIteracao = execucoesFinais?.map((e) => ({
      ...e,
      iteracao: e.iteracao ?? cicloRevezamento?.iteracao ?? dto.cicloIteracao ?? 0,
    }));

    const execucoesComExecutor = atribuirExecucoes(
      execucoesComIteracao ?? [],
      dto.responsavelAtualId,
      dto.participantesId,
    );

    const tarefa = await tarefaRepository.create({
      ...dto,
      pontos: dto.pontos ?? 0,
      cicloIteracao: cicloRevezamento?.iteracao,
      execucoes: execucoesComExecutor.length > 0 ? execucoesComExecutor : undefined,
    });

    if (dto.responsavelAtualId && dto.responsavelAtualId !== dto.criadoPorId) {
      const membroResponsavel = await familyRepository.findMembroById(dto.responsavelAtualId);

      let usuarioIdNotificacao = membroResponsavel?.usuario?.id;

      if (!usuarioIdNotificacao) {
        const membros = await familyRepository.findMembrosByFamilia(tarefa.familiaId);
        const admin = membros.find(m => m.permissao === 'ADMIN' && m.usuario?.id);
        usuarioIdNotificacao = admin?.usuario?.id;
      }

      if (usuarioIdNotificacao) {
        await notificationService.criar({
          usuarioId: usuarioIdNotificacao,
          tipo: NotificacaoTipo.TAREFA_ATRIBUIDA,
          titulo: 'Nova tarefa atribuída',
          mensagem: `Você foi designado(a) para a tarefa "${tarefa.titulo}"`,
          dados: JSON.stringify({ tarefaId: tarefa.id }),
        });
      }
    }

    if (dto.participantesId && dto.participantesId.length > 0) {
      const destinatariosVistos = new Set<string>();
      if (dto.responsavelAtualId) {
        const membroResp = await familyRepository.findMembroById(dto.responsavelAtualId);
        if (membroResp?.usuario?.id) destinatariosVistos.add(membroResp.usuario.id);
      }

      for (const membroId of dto.participantesId) {
        if (destinatariosVistos.has(membroId)) continue;
        const membro = await familyRepository.findMembroById(membroId);
        const usuarioId = membro?.usuario?.id;
        if (!usuarioId || destinatariosVistos.has(usuarioId)) continue;
        destinatariosVistos.add(usuarioId);
        await notificationService.criar({
          usuarioId,
          tipo: NotificacaoTipo.TAREFA_ATRIBUIDA,
          titulo: 'Nova tarefa atribuída',
          mensagem: `Você foi adicionado(a) como participante na tarefa "${tarefa.titulo}"`,
          dados: JSON.stringify({ tarefaId: tarefa.id }),
        });
      }
    }

    return transformTarefa(tarefa);
  }

  async listar(
    familiaId: string,
    options: {
      filtro?: Record<string, string | string[]>;
      ordenacao?: { coluna: string; direcao: 'asc' | 'desc' }[];
      pagina: number;
      porPagina: number;
      paginaResposta: number;
      porPaginaResposta: number;
      membroId?: string;
      permissao?: string;
    },
  ) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const filtro = options.filtro ? { ...options.filtro } : {};

    if (filtro.dependente !== undefined) {
      const isDependente = filtro.dependente === 'true';
      delete filtro.dependente;

      const membros = await familyRepository.findMembrosByFamilia(familiaId);
      const ids = membros
        .filter((m: any) => m.dependente === isDependente)
        .map((m: any) => m.id);

      if (ids.length > 0) {
        filtro.responsavelAtualId = ids.length === 1 ? ids[0] : ids;
      } else {
        filtro.responsavelAtualId = 'none';
      }
    }

    const { data, total } = await tarefaRepository.findByFamiliaWithFilters(
      familiaId,
      { filtro, ordenacao: options.ordenacao, pagina: options.pagina, porPagina: options.porPagina, membroId: options.membroId, permissao: options.permissao },
    );

    const ultimaPagina = Math.ceil(total / options.porPagina);

    const result = data.map(transformTarefa);

    const agora = new Date();
    const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);

    result.sort((a: any, b: any) => {
      const prioridade = (t: any): number => {
        const execs = t.execucoes ?? [];
        const temAtrasada = execs.some((e: any) => e.status === StatusExecucao.ATRASADA);
        if (temAtrasada) return 0;
        const temHoje = execs.some(
          (e: any) => e.status === StatusExecucao.AGENDADA && new Date(e.data) < fimHoje,
        );
        if (temHoje) return 1;
        const temProximo = execs.some((e: any) => e.status === StatusExecucao.AGENDADA);
        if (temProximo) return 2;
        return 3;
      };

      const pa = prioridade(a);
      const pb = prioridade(b);
      if (pa !== pb) return pa - pb;

      const menorData = (t: any): number => {
        const agendadas = (t.execucoes ?? [])
          .filter((e: any) => e.status === StatusExecucao.AGENDADA)
          .map((e: any) => new Date(e.data).getTime());
        return agendadas.length > 0 ? Math.min(...agendadas) : Infinity;
      };
      return menorData(a) - menorData(b);
    });

    return {
      filtro,
      ordenacao: options.ordenacao ?? [{ coluna: 'criadoEm', direcao: 'desc' }],
      paginacao: {
        total: ultimaPagina,
        pagina: options.paginaResposta,
        por_pagina: options.porPaginaResposta,
        ultima_pagina: ultimaPagina,
      },
      data: result,
    };
  }

  async obter(familiaId: string, tarefaId: string, membroId?: string, permissao?: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    if (membroId && permissao && permissao !== 'ADMIN') {
      const tarefaAny = tarefa as any;
      const ehCriador = tarefaAny.criadoPorId === membroId;
      const ehResponsavel = tarefaAny.responsavelAtualId === membroId;
      const ehParticipante = tarefaAny.participantes?.some((p: any) => p.membroId === membroId);
      if (!ehCriador && !ehResponsavel && !ehParticipante) {
        throw new AppError('Tarefa não encontrada', 404);
      }
    }

    return transformTarefa(tarefa);
  }

  async atualizar(familiaId: string, tarefaId: string, dto: AtualizarTarefaDTO) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    if (dto.tipo === TipoTarefa.PESSOAL && !dto.responsavelAtualId) {
      throw new AppError('Tarefa pessoal deve ter um responsável', 400);
    }

    const responsavelFinal = dto.responsavelAtualId !== undefined ? dto.responsavelAtualId : tarefa.responsavelAtualId;
    const participantesFinais = dto.participantesId !== undefined ? dto.participantesId : null;

    if (dto.tipo === TipoTarefa.PESSOAL) {
      dto.participantesId = null;
    }

    if (dto.participantesId && dto.participantesId.length > 0) {
      const membros = await familyRepository.findMembrosByFamilia(familiaId);
      const membrosAtivos = new Set(
        membros.filter((m: any) => m.status === 'ACEITO').map((m: any) => m.id),
      );
      for (const membroId of dto.participantesId) {
        if (!membrosAtivos.has(membroId)) {
          throw new AppError(`Participante ${membroId} não é membro ativo desta família`, 400);
        }
      }
      const duplicados = dto.participantesId.filter((id, i) => dto.participantesId!.indexOf(id) !== i);
      if (duplicados.length > 0) {
        throw new AppError('Participantes duplicados não são permitidos', 400);
      }
    }

    if (
      dto.tipo === TipoTarefa.FAMILIAR &&
      dto.modoDistribuicao === ModoDistribuicao.FIXA &&
      !responsavelFinal
    ) {
      throw new AppError('Tarefa fixa deve ter um responsável', 400);
    }

    if (dto.cicloId !== undefined && dto.cicloId !== tarefa.cicloId) {
      const ultimaExecucao = tarefa.execucoes?.length
        ? tarefa.execucoes.reduce((maisRecente, e) => {
            const dataE = new Date(e.data);
            return dataE > maisRecente ? dataE : maisRecente;
          }, new Date(0))
        : null;

      if (ultimaExecucao && ultimaExecucao.getTime() > 0) {
        const cicloNovo = await cicloRepository.findById(String(dto.cicloId));
        if (cicloNovo) {
          const fimCiclo = cicloNovo.proximaRenovacao
            ? new Date(cicloNovo.proximaRenovacao)
            : new Date(cicloNovo.inicio.getTime() + cicloNovo.duracaoDias * 24 * 60 * 60 * 1000);

          if (fimCiclo < ultimaExecucao) {
            throw new AppError(
              `O ciclo escolhido vence em ${fimCiclo.toLocaleDateString('pt-BR')}, mas a última execução desta tarefa é em ${ultimaExecucao.toLocaleDateString('pt-BR')}. Escolha um ciclo com duração suficiente.`,
              400,
            );
          }
        }
      }
    }

    if (dto.execucoes) {
      const execucoesExistentes = await tarefaRepository.findExecucoesByTarefa(tarefaId);
      const iteracaoPorId = new Map(execucoesExistentes.map((e: any) => [e.id, e.iteracao]));

      dto.execucoes = dto.execucoes.map((e) => {
        if (e.id && iteracaoPorId.has(e.id)) {
          return { ...e, iteracao: e.iteracao ?? iteracaoPorId.get(e.id) ?? null };
        }
        return { ...e, iteracao: e.iteracao ?? (tarefa as any).ciclo?.iteracao ?? tarefa.cicloIteracao ?? 0 };
      });
    }

    if (dto.participantesId !== undefined) {
      const execucoesAgendadas = await tarefaRepository.findExecucoesByTarefa(tarefaId);
      const agendadas = execucoesAgendadas
        .filter((e: any) => e.status === StatusExecucao.AGENDADA)
        .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());

      if (agendadas.length > 0) {
        const reatribuidas = atribuirExecucoes(agendadas, responsavelFinal, participantesFinais);
        for (const e of reatribuidas) {
          await tarefaRepository.updateExecucao(e.id, { executorId: e.executorId });
        }
      }
    }

    if (dto.recorrencia !== undefined) {
      const recorrenciaAntiga = tarefa.recorrencia as Recorrencia | null;
      const recorrenciaNova = dto.recorrencia;

      const mudou = JSON.stringify(recorrenciaAntiga) !== JSON.stringify(recorrenciaNova);

      if (mudou && recorrenciaNova) {
        let cicloTarefa: { inicio: Date; renovadoEm: Date | null; proximaRenovacao: Date | null } | null = null;
        if (tarefa.cicloId) {
          cicloTarefa = await cicloRepository.findById(tarefa.cicloId) as any;
        }

        let diasAFrente = 7;
        let fimCiclo: Date | null = null;
        if (cicloTarefa) {
          fimCiclo = cicloTarefa.proximaRenovacao
            ? new Date(cicloTarefa.proximaRenovacao)
            : new Date(cicloTarefa.inicio.getTime() + (cicloTarefa as any).duracaoDias * 24 * 60 * 60 * 1000);
          const agora = new Date();
          const diffMs = fimCiclo.getTime() - agora.getTime();
          diasAFrente = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        await tarefaRepository.deleteFutureAgendadas(tarefaId, hoje);

        const geradas = gerarExecucoesRecorrentes(recorrenciaNova, hoje, diasAFrente);
        const agoraAtualizar = new Date();
        const futurasAtualizar = geradas.filter(
          (e) => e.data >= agoraAtualizar && (!fimCiclo || e.data <= fimCiclo),
        );
        validarDatasExecucoes(futurasAtualizar, cicloTarefa);
        if (futurasAtualizar.length > 0) {
          const comExecutor = atribuirExecucoes(futurasAtualizar, responsavelFinal, participantesFinais);
          await tarefaRepository.createExecucoes(
            tarefaId,
            comExecutor.map((e) => ({ data: e.data, status: e.status, iteracao: 0, executorId: e.executorId })),
          );
        }

        delete dto.execucoes;
      } else if (mudou && !recorrenciaNova) {
        delete dto.execucoes;
      }
    }

    const resultado = await tarefaRepository.update(tarefaId, dto);
    return transformTarefa(resultado);
  }

  async remover(familiaId: string, tarefaId: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    await tarefaRepository.delete(tarefaId);

    return { message: 'Tarefa removida com sucesso' };
  }

  async concluir(familiaId: string, tarefaId: string, execucaoId: string, membroId: string) {
    const tarefa = await tarefaRepository.findById(tarefaId);
    if (!tarefa || tarefa.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    if (!tarefa.ativo) {
      throw new AppError('Tarefa inativa não pode ser concluída', 400);
    }

    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao || execucao.tarefaId !== tarefaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.status !== StatusExecucao.AGENDADA && execucao.status !== StatusExecucao.ATRASADA) {
      throw new AppError('Execução já foi concluída ou cancelada', 400);
    }

    let pontosObtidos = 0;

    if (tarefa.tipo !== 'PESSOAL') {
      const gamificacao = await tarefaRepository.findGamificacaoAtiva(familiaId);
      if (gamificacao) {
        pontosObtidos = tarefa.pontos;
      }
    }

    await tarefaRepository.updateExecucao(execucaoId, {
      status: StatusExecucao.CONCLUIDA,
      pontosObtidos,
      concluidoPorId: membroId,
      concluidoEm: new Date(),
    });

    return {
      message: 'Tarefa concluída com sucesso',
      pontosGerados: pontosObtidos,
    };
  }

  async concluirExecucao(familiaId: string, execucaoId: string, membroId: string) {
    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.tarefa.familiaId !== familiaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.status !== StatusExecucao.AGENDADA && execucao.status !== StatusExecucao.ATRASADA) {
      throw new AppError('Execução já foi concluída ou cancelada', 400);
    }

    const tarefa = execucao.tarefa;

    const pontosObtidos = tarefa.pontos;

    await tarefaRepository.updateExecucao(execucaoId, {
      status: StatusExecucao.CONCLUIDA,
      pontosObtidos,
      concluidoPorId: membroId,
      concluidoEm: new Date(),
    });

    return {
      message: 'Execução concluída com sucesso',
      pontosGerados: pontosObtidos,
    };
  }

  async cancelarExecucao(familiaId: string, execucaoId: string) {
    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.tarefa.familiaId !== familiaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.status !== StatusExecucao.AGENDADA && execucao.status !== StatusExecucao.ATRASADA) {
      throw new AppError('Execução já foi concluída ou cancelada', 400);
    }

    await tarefaRepository.updateExecucao(execucaoId, {
      status: StatusExecucao.CANCELADA,
    });

    return {
      message: 'Execução cancelada com sucesso',
    };
  }

  async atualizarExecucao(familiaId: string, execucaoId: string, data?: Date, executorId?: string | null) {
    const execucao = await tarefaRepository.findExecucaoById(execucaoId);
    if (!execucao) {
      throw new AppError('Execução não encontrada', 404);
    }

    if (execucao.tarefa.familiaId !== familiaId) {
      throw new AppError('Execução não encontrada', 404);
    }

    let cicloTarefa: { inicio: Date; renovadoEm: Date | null; proximaRenovacao: Date | null } | null = null;
    if (execucao.tarefa.cicloId) {
      cicloTarefa = await cicloRepository.findById(execucao.tarefa.cicloId) as any;
    }

    const updateData: Record<string, any> = {};
    if (data) {
      validarDatasExecucoes([{ data }], cicloTarefa);
      updateData.data = data;
    }
    if (executorId !== undefined && executorId !== null) {
      updateData.executorId = executorId;
    }
    await tarefaRepository.updateExecucao(execucaoId, updateData);

    return {
      message: 'Execução atualizada com sucesso',
    };
  }

  async atualizarExecucoesAtrasadas(familiaId: string) {
    return tarefaRepository.atualizarExecucoesAtrasadas(familiaId);
  }

  async ranking(familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const ranking = await tarefaRepository.findRanking(familiaId);
    const membros = await tarefaRepository.findMembrosByFamilia(familiaId);
    const membroMap = new Map(membros.map((m) => [m.id, m]));

    return ranking.map((item) => {
      const membro = membroMap.get(item.concluidoPorId!);
      return {
        membroId: item.concluidoPorId,
        nome: membro?.nome ?? 'Desconhecido',
        fotoPerfil: membro?.fotoPerfil ?? null,
        pontos: item._sum.pontosObtidos ?? 0,
      };
    });
  }

  async urgentes(familiaId: string, membroId?: string, permissao?: string) {
    const tarefas = await tarefaRepository.findUrgentesByFamilia(familiaId, membroId, permissao);

    const comUrgencia = tarefas.map((tarefa: any) => {
      const execucoes = tarefa.execucoes ?? [];
      const atrasadas = execucoes.filter((e: any) => e.status === 'ATRASADA');
      const agendadas = execucoes.filter((e: any) => e.status === 'AGENDADA');

      const maisUrgente = atrasadas.length > 0
        ? atrasadas.reduce((mais: any, e: any) => e.data < mais.data ? e : mais)
        : agendadas.reduce((mais: any, e: any) => e.data < mais.data ? e : mais, agendadas[0]);

      const dataRef = maisUrgente?.data ?? new Date(0);
      const ehAtrasada = atrasadas.length > 0;

      return { tarefa, maisUrgente, dataRef, ehAtrasada };
    });

    comUrgencia.sort((a, b) => {
      if (a.ehAtrasada !== b.ehAtrasada) return a.ehAtrasada ? -1 : 1;
      return new Date(a.dataRef).getTime() - new Date(b.dataRef).getTime();
    });

    return comUrgencia.slice(0, 4).map(({ tarefa, maisUrgente }) =>
      transformTarefa({
        ...tarefa,
        execucoes: maisUrgente ? [maisUrgente] : [],
      }),
    );
  }

  async resumo(familiaId: string, membroId?: string, permissao?: string) {
    const totalTarefas = await tarefaRepository.countTarefasDoDia(familiaId, membroId, permissao);
    const execucoesConcluidas = await tarefaRepository.countExecucoesByFamiliaAndStatus(
      familiaId,
      StatusExecucao.CONCLUIDA,
      membroId,
      permissao,
    );
    const execucoesAtrasadas = await tarefaRepository.countExecucoesByFamiliaAndStatus(
      familiaId,
      StatusExecucao.ATRASADA,
      membroId,
      permissao,
    );

    const ciclosAtivos = await cicloRepository.findCiclosAtivos(familiaId);
    const agora = new Date();

    const ciclos = ciclosAtivos.map((c) => {
      const referencia = c.proximaRenovacao
        ? new Date(c.proximaRenovacao)
        : new Date(c.inicio.getTime() + c.duracaoDias * 24 * 60 * 60 * 1000);
      const diffMs = referencia.getTime() - agora.getTime();
      const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        id: c.id,
        nome: c.nome,
        inicio: c.inicio,
        duracaoDias: c.duracaoDias,
        diasRestantes,
      };
    });

    return {
      totalTarefas,
      execucoesConcluidas,
      execucoesAtrasadas,
      ciclos,
    };
  }

  async duplicar(familiaId: string, tarefaId: string, criadoPorId: string) {
    const original = await tarefaRepository.findById(tarefaId);
    if (!original || original.familiaId !== familiaId) {
      throw new AppError('Tarefa não encontrada', 404);
    }

    const participantesOriginais = (original as any).participantes
      ? (original as any).participantes.map((pt: any) => pt.membroId)
      : [];

    const nova = await tarefaRepository.create({
      familiaId,
      titulo: original.titulo,
      descricao: original.descricao,
      tipo: original.tipo as TipoTarefa,
      categoria: original.categoria as Categoria,
      modoDistribuicao: original.modoDistribuicao as ModoDistribuicao | null,
      responsavelAtualId: original.responsavelAtualId,
      participantesId: participantesOriginais.length > 0 ? participantesOriginais : undefined,
      pontos: original.pontos,
      cicloId: original.cicloId,
      cicloIteracao: original.cicloIteracao,
      recorrencia: (original.recorrencia as unknown as Recorrencia) ?? undefined,
      criadoPorId,
      execucoes: original.execucoes.map((e) => ({
        data: e.data,
        status: e.status as StatusExecucao,
        pontosObtidos: e.pontosObtidos,
        iteracao: e.iteracao,
        executorId: (e as any).executorId ?? null,
      })),
    });

    return transformTarefa(nova);
  }
}

export const tarefaService = new TarefaService();
