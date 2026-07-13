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
    console.log('[FCM Debug] Salvando token no banco. usuarioId:', usuarioId);
    await dispositivoPushRepository.create({ usuarioId, token, plataforma });
    console.log('[FCM Debug] Token salvo com sucesso');
    return { message: 'Dispositivo registrado com sucesso' };
  }

  async unsubscribe(usuarioId: string, token: string) {
    await dispositivoPushRepository.deleteByToken(token);
    return { message: 'Dispositivo removido com sucesso' };
  }

  async sendToUser(usuarioId: string, payload: PushPayload) {
    console.log('[FCM Debug] sendToUser chamado para usuarioId:', usuarioId);
    const dispositivos = await dispositivoPushRepository.findByUsuario(usuarioId);
    console.log('[FCM Debug] Dispositivos encontrados:', dispositivos.length);

    if (dispositivos.length === 0) {
      console.log('[FCM Debug] Nenhum dispositivo registrado para este usuário!');
    }

    const resultados: { token: string; status: string; erro?: string }[] = [];

    for (const dispositivo of dispositivos) {
      try {
        console.log('[FCM Debug] Enviando FCM para token:', dispositivo.token.substring(0, 30) + '...');
        await this.sendFCM(dispositivo.token, payload);
        console.log('[FCM Debug] FCM enviado com sucesso');
        resultados.push({ token: dispositivo.token, status: 'sent' });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('[FCM Debug] Erro ao enviar FCM:', errorMessage);

        if (errorMessage.includes('registration-token-not-registered')) {
          await dispositivoPushRepository.delete(dispositivo.id);
          resultados.push({ token: dispositivo.token, status: 'expired' });
        } else {
          resultados.push({ token: dispositivo.token, status: 'error', erro: errorMessage });
        }
      }
    }

    console.log('[FCM Debug] Resultados envio:', JSON.stringify(resultados));
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
