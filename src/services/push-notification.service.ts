import { dispositivoPushRepository } from '../repositories/dispositivo-push.repository';
import { env } from '../config/env';

interface PushPayload {
  titulo: string;
  mensagem: string;
  imagem?: string;
  url?: string;
  id?: string;
  execucaoId?: string;
}

class PushNotificationService {
  async subscribe(usuarioId: string, token: string, plataforma = 'fcm') {
    await dispositivoPushRepository.create({ usuarioId, token, plataforma });
    return { message: 'Dispositivo registrado com sucesso' };
  }

  async unsubscribe(usuarioId: string, token: string) {
    await dispositivoPushRepository.deleteByToken(token);
    return { message: 'Dispositivo removido com sucesso' };
  }

  async sendToUser(usuarioId: string, payload: PushPayload) {
    const dispositivos = await dispositivoPushRepository.findByUsuario(usuarioId);

    const resultados: { token: string; status: string; erro?: string }[] = [];

    for (const dispositivo of dispositivos) {
      try {
        await this.sendFCM(dispositivo.token, payload);
        resultados.push({ token: dispositivo.token, status: 'sent' });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

        if (errorMessage.includes('registration-token-not-registered')) {
          await dispositivoPushRepository.delete(dispositivo.id);
          resultados.push({ token: dispositivo.token, status: 'expired' });
        } else {
          resultados.push({ token: dispositivo.token, status: 'error', erro: errorMessage });
        }
      }
    }

    return resultados;
  }

  private async sendFCM(token: string, payload: PushPayload) {
    const { ensureFirebaseAdmin } = await import('../config/firebase-admin');
    ensureFirebaseAdmin();

    const { getMessaging } = await import('firebase-admin/messaging');
    const message = {
      token,
      notification: {
        title: payload.titulo,
        body: payload.mensagem,
        imageUrl: payload.imagem,
      },
      data: {
        url: payload.url ?? '/',
        id: payload.id ?? '',
        execucaoId: payload.execucaoId ?? '',
      },
      webpush: {
        fcmOptions: {
          link: payload.url ?? '/',
        },
      },
    };

    await getMessaging().send(message);
  }
}

export const pushNotificationService = new PushNotificationService();
