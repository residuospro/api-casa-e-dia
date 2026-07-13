import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { env } from './env';

let initialized = false;

export function ensureFirebaseAdmin() {
  if (initialized) return;

  initializeApp({
    credential: applicationDefault(),
    projectId: env.firebaseProjectId,
  });

  initialized = true;
}
