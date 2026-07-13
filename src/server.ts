import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import uploadRoutes from './routes/upload.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { env } from './config/env';
import { initSocket } from './socket';
import { initScheduler } from './scheduler';
import { initCycleScheduler } from './scheduler/cycle';
import { initializeApp, applicationDefault } from 'firebase-admin/app';

const app = express();

initializeApp({
  credential: applicationDefault(),
  projectId: env.firebaseProjectId,
});

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());

app.use(routes);
app.use('/uploads', uploadRoutes);

app.use(errorMiddleware);

const httpServer = http.createServer(app);
initSocket(httpServer);
initScheduler();
initCycleScheduler();

httpServer.listen(env.port, () => {
  console.log(`Servidor rodando na porta ${env.port}`);
});
