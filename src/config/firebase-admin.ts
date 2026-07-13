import { getApps } from 'firebase-admin/app';
import { env } from './env';

let initialized = false;

export function ensureFirebaseAdmin() {
  if (initialized || getApps().length > 0) return;

  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  initializeApp({
    credential: applicationDefault(),
    projectId: env.firebaseProjectId,
  });

  initialized = true;
}
