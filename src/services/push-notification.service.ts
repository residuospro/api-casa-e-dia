import webpush, { PushSubscription } from 'web-push';
import { env } from '../config/env';
import { pushSubscriptionRepository } from '../repositories/push-subscription.repository';

webpush.setVapidDetails(
  'mailto:minhacasaemdia2026@gmail.com',
  env.vapidPublicKey,
  env.vapidPrivateKey,
);

export class PushNotificationService {
  async subscribe(
    usuarioId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    await pushSubscriptionRepository.create({
      usuarioId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    });
    return { message: 'Inscrito com sucesso' };
  }

  async unsubscribe(usuarioId: string, endpoint: string) {
    await pushSubscriptionRepository.deleteByEndpoint(endpoint);
    return { message: 'Removido com sucesso' };
  }

  async sendToUser(
    usuarioId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> },
  ) {
    const subscriptions = await pushSubscriptionRepository.findByUsuario(usuarioId);
    const results: { endpoint: string; status: string; error?: string }[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          } as PushSubscription,
          JSON.stringify(payload),
        );
        results.push({ endpoint: sub.endpoint, status: 'sent' });
      } catch (err: unknown) {
        const webpushErr = err as { statusCode?: number; message?: string };
        if (webpushErr.statusCode === 410 || webpushErr.statusCode === 404) {
          await pushSubscriptionRepository.delete(sub.id);
          results.push({ endpoint: sub.endpoint, status: 'expired' });
        } else {
          results.push({
            endpoint: sub.endpoint,
            status: 'error',
            error: webpushErr.message || 'Unknown error',
          });
        }
      }
    }

    return results;
  }
}

export const pushNotificationService = new PushNotificationService();
