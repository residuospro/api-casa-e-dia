import { getApps, initializeApp, cert } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';
import { env } from './env';

let initialized = false;

export function ensureFirebaseAdmin() {
  if (initialized || getApps().length > 0) {
    console.log('[FCM Debug] Firebase Admin já inicializado, pulando.');
    return;
  }

  console.log('[FCM Debug] Firebase Admin não inicializado, inicializando...');
  const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  try {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: env.firebaseProjectId,
    });
    initialized = true;
    console.log('[FCM Debug] Firebase Admin inicializado com sucesso');
  } catch (err) {
    console.error('[FCM Debug] Erro ao inicializar Firebase Admin:', err);
  }
}
