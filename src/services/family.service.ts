import { familyRepository } from '../repositories/family.repository';
import { sendInviteEmail } from './email.service';
import { AppError } from './auth.service';
import { authRepository } from '../repositories/auth.repository';
import { notificationService } from './notification.service';
import { generateAvatar } from '../utils/avatar';

const MEMBROS_CACHE_TTL_MS = 60 * 1000;
const membrosCache = new Map<string, { dados: unknown; expiraEm: number }>();

function chaveCache(prefixo: string, familiaId: string): string {
  return `${prefixo}:${familiaId}`;
}

function obterCacheMembros<T>(prefixo: string, familiaId: string): T | null {
  const chave = chaveCache(prefixo, familiaId);
  const entrada = membrosCache.get(chave);
  if (!entrada) return null;

  if (entrada.expiraEm < Date.now()) {
    membrosCache.delete(chave);
    return null;
  }

  return entrada.dados as T;
}

function definirCacheMembros(prefixo: string, familiaId: string, dados: unknown): void {
  membrosCache.set(chaveCache(prefixo, familiaId), {
    dados,
    expiraEm: Date.now() + MEMBROS_CACHE_TTL_MS,
  });
}

export function invalidarCacheMembros(familiaId: string): void {
  membrosCache.delete(chaveCache('membros', familiaId));
  membrosCache.delete(chaveCache('opcoes', familiaId));
}

function mapMembro(m: any) {
  const usuario = m.usuario
    ? {
        ...m.usuario,
        fotoPerfil: m.usuario.fotoPerfil ?? generateAvatar(m.usuario.nome, m.usuario.genero),
      }
    : null;

  const nome = m.nome ?? m.usuario?.nome ?? null;
  const genero = m.genero ?? m.usuario?.genero ?? null;
  const generoAvatar =
    genero ??
    (m.tipoPessoa === 'FILHA' ? 'FEMININO' : m.tipoPessoa === 'FILHO' ? 'MASCULINO' : null);

  return {
    id: m.id,
    usuarioId: m.usuarioId,
    familiaId: m.familiaId,
    nome,
    genero,
    tipoPessoa: m.tipoPessoa,
    permissao: m.permissao,
    dependente: m.dependente,
    status: m.status,
    conviteEnviado: m.conviteEnviado,
    fotoPerfil:
      m.fotoPerfil ?? usuario?.fotoPerfil ?? (nome ? generateAvatar(nome, generoAvatar) : null),
    criadoEm: m.criadoEm,
    usuario,
  };
}

export class FamilyService {
  async convidarMembro(dto: {
    familiaId: string;
    email: string;
    tipoPessoa: string;
    permissao: string;
    solicitante: { id: string; nome: string; fotoPerfil: string | null };
  }) {
    const familia = await familyRepository.findFamiliaById(dto.familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const usuario = await authRepository.findUsuarioByEmail(dto.email);
    if (!usuario) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const jaMembro = await familyRepository.findMembroByUsuarioAndFamilia(
      usuario.id,
      dto.familiaId,
    );
    if (jaMembro) {
      throw new AppError('Usuário já é membro desta família', 409);
    }

    const membro = await familyRepository.createMembroFamilia({
      usuarioId: usuario.id,
      familiaId: dto.familiaId,
      tipoPessoa: dto.tipoPessoa,
      permissao: dto.permissao,
      status: 'PENDENTE',
    });

    let conviteEnviado = false;

    try {
      await sendInviteEmail(usuario.email, usuario.nome, familia.nome);
      conviteEnviado = true;
      await familyRepository.updateConviteEnviado(membro.id);
    } catch {
      console.error('Falha ao enviar email de convite para', dto.email);
    }

    await notificationService.criar({
      usuarioId: usuario.id,
      tipo: 'CONVITE_FAMILIA' as any,
      titulo: 'Novo convite de família',
      mensagem: `Você foi convidado(a) para a família ${familia.nome}`,
      dados: JSON.stringify({
        familiaId: dto.familiaId,
        membroId: membro.id,
        remetenteNome: dto.solicitante.nome,
        remetenteFotoPerfil: dto.solicitante.fotoPerfil,
      }),
    });

    const membroCompleto = await familyRepository.findMembroById(membro.id);
    invalidarCacheMembros(dto.familiaId);

    return {
      message: 'Convite enviado com sucesso',
      membro: mapMembro(membroCompleto),
      conviteEnviado,
    };
  }

  async cadastrarDependente(dto: {
    familiaId: string;
    nome: string;
    genero: string;
    tipoPessoa: string;
    fotoPerfil?: string;
  }) {
    const familia = await familyRepository.findFamiliaById(dto.familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.createMembroFamilia({
      usuarioId: null,
      familiaId: dto.familiaId,
      nome: dto.nome,
      fotoPerfil: dto.fotoPerfil || null,
      genero: dto.genero,
      tipoPessoa: dto.tipoPessoa,
      permissao: 'USUARIO',
      dependente: true,
      conviteEnviado: true,
      status: 'ACEITO',
    });
    invalidarCacheMembros(dto.familiaId);

    return { message: 'Dependente cadastrado com sucesso', membro: mapMembro(membro) };
  }

  async listarConvitesPendentes(usuarioId: string) {
    return familyRepository.findConvitesPendentes(usuarioId);
  }

  async responderConvite(usuarioId: string, membroId: string, aceito: boolean) {
    const membro = await familyRepository.findMembroById(membroId);
    if (!membro) {
      throw new AppError('Convite não encontrado', 404);
    }

    if (membro.usuarioId !== usuarioId) {
      throw new AppError('Este convite não pertence a você', 403);
    }

    if (membro.status !== 'PENDENTE') {
      throw new AppError('Este convite já foi respondido', 400);
    }

    const status = aceito ? 'ACEITO' : 'RECUSADO';
    const atualizado = await familyRepository.updateMembroStatus(membroId, status);
    invalidarCacheMembros(membro.familiaId);

    return {
      message: `Convite ${aceito ? 'aceito' : 'recusado'} com sucesso`,
      membro: mapMembro(atualizado),
    };
  }

  async reEnviarConvite(familiaId: string, membroId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.findMembroById(membroId);
    if (!membro || membro.familiaId !== familiaId) {
      throw new AppError('Membro não encontrado', 404);
    }

    if (!membro.usuario) {
      throw new AppError('Este membro não possui um usuário vinculado', 400);
    }

    await sendInviteEmail(membro.usuario.email, membro.usuario.nome, familia.nome);
    await familyRepository.updateConviteEnviado(membroId);
    invalidarCacheMembros(familiaId);

    return { message: 'Convite reenviado com sucesso' };
  }

  async listarMembros(familiaId: string) {
    const emCache = obterCacheMembros<any[]>('membros', familiaId);
    if (emCache) return emCache;

    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membros = await familyRepository.findMembrosByFamilia(familiaId);
    const ids = membros.map((m: any) => m.id);
    const estatisticas = await familyRepository.findEstatisticasMembros(familiaId, ids);

    const resultado = membros.map((m: any) => ({
      ...mapMembro(m),
      ...estatisticas[m.id],
    }));
    definirCacheMembros('membros', familiaId, resultado);
    return resultado;
  }

  async listarOpcoesMembros(familiaId: string) {
    const emCache = obterCacheMembros<any[]>('opcoes', familiaId);
    if (emCache) return emCache;

    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membros = await familyRepository.findMembrosByFamilia(familiaId);

    const resultado = membros.map((m) => ({
      text: m.nome ?? m.usuario?.nome ?? 'Sem nome',
      value: m.id,
      fotoPerfil:
        m.fotoPerfil ??
        m.usuario?.fotoPerfil ??
        generateAvatar(
          m.nome ?? m.usuario?.nome ?? 'Sem nome',
          m.genero ?? m.usuario?.genero ?? null,
        ),
    }));
    definirCacheMembros('opcoes', familiaId, resultado);
    return resultado;
  }

  async buscarMembros(familiaId: string, query: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membros = await familyRepository.searchMembros(familiaId, query);

    return membros.map(mapMembro);
  }

  async obterMembro(familiaId: string, membroId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.findMembroById(membroId);
    if (!membro || membro.familiaId !== familiaId) {
      throw new AppError('Membro não encontrado', 404);
    }

    return mapMembro(membro);
  }

  async atualizarMembro(
    familiaId: string,
    membroId: string,
    dto: {
      nome?: string;
      fotoPerfil?: string | null;
      genero?: string | null;
      tipoPessoa?: string;
      permissao?: string | null;
    },
  ) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.findMembroById(membroId);
    if (!membro || membro.familiaId !== familiaId) {
      throw new AppError('Membro não encontrado', 404);
    }

    if (membro.usuarioId) {
      if (dto.nome !== undefined) {
        throw new AppError('Altere o nome diretamente no perfil do usuário', 400);
      }
      if (dto.genero !== undefined) {
        throw new AppError('Altere o gênero diretamente no perfil do usuário', 400);
      }
      if (dto.fotoPerfil !== undefined) {
        throw new AppError('Altere a foto diretamente no perfil do usuário', 400);
      }
    }

    if (!membro.usuarioId) {
      if (dto.permissao !== undefined) {
        throw new AppError('Não é possível definir permissão para um dependente', 400);
      }
    }

    const atualizado = await familyRepository.updateMembro(membroId, dto);
    invalidarCacheMembros(familiaId);

    return mapMembro(atualizado);
  }

  async removerMembro(familiaId: string, membroId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.findMembroById(membroId);
    if (!membro || membro.familiaId !== familiaId) {
      throw new AppError('Membro não encontrado', 404);
    }

    await familyRepository.deleteMembro(membroId);
    invalidarCacheMembros(familiaId);

    return { message: 'Membro removido com sucesso' };
  }

  async criarFamilia(usuarioId: string, nome: string, tipoPessoa: string) {
    let familia: any;

    await familyRepository.transaction(async (tx) => {
      familia = await tx.familia.create({ data: { nome } });

      await tx.membroFamilia.create({
        data: {
          usuarioId,
          familiaId: familia.id,
          tipoPessoa: tipoPessoa as any,
          permissao: 'ADMIN',
          conviteEnviado: true,
          status: 'ACEITO',
        },
      });
    });

    return {
      id: familia.id,
      nome: familia.nome,
      criadoEm: familia.criadoEm,
      _count: { membros: 1 },
    };
  }

  async listarFamilias(usuarioId: string) {
    return familyRepository.findFamiliasByUsuario(usuarioId);
  }

  async obterFamilia(usuarioId: string) {
    const familias = await familyRepository.findFamiliasByUsuario(usuarioId);

    return familias;
  }

  async atualizarFamilia(usuarioId: string, familiaId: string, nome: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.findMembroByUsuarioAndFamilia(usuarioId, familiaId);
    if (!membro || membro.permissao !== 'ADMIN') {
      throw new AppError('Apenas administradores podem alterar a família', 403);
    }

    return familyRepository.updateFamilia(familiaId, nome);
  }

  async removerFamilia(usuarioId: string, familiaId: string) {
    const familia = await familyRepository.findFamiliaById(familiaId);
    if (!familia) {
      throw new AppError('Família não encontrada', 404);
    }

    const membro = await familyRepository.findMembroByUsuarioAndFamilia(usuarioId, familiaId);
    if (!membro || membro.permissao !== 'ADMIN') {
      throw new AppError('Apenas administradores podem remover a família', 403);
    }

    await familyRepository.transaction(async (tx) => {
      await tx.membroFamilia.deleteMany({ where: { familiaId } });
      await tx.familia.delete({ where: { id: familiaId } });
    });
    invalidarCacheMembros(familiaId);

    return { message: 'Família removida com sucesso' };
  }
}

export const familyService = new FamilyService();
