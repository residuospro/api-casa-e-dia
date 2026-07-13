import { getApps } from 'firebase-admin/app';
import { env } from './env';

let initialized = false;

export function ensureFirebaseAdmin() {
  if (initialized || getApps().length > 0) {
    console.log('[FCM Debug] Firebase Admin já inicializado, pulando.');
    return;
  }

  console.log('[FCM Debug] Firebase Admin não inicializado, inicializando...');
  const { initializeApp, cert } = require('firebase-admin/app');
  const serviceAccountKey = require('../../serviceAccountKey.json');
  try {
    initializeApp({
      credential: cert(serviceAccountKey),
      projectId: env.firebaseProjectId,
    });
    initialized = true;
    console.log('[FCM Debug] Firebase Admin inicializado com sucesso');
  } catch (err) {
    console.error('[FCM Debug] Erro ao inicializar Firebase Admin:', err);
  }
}
