import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { env } from '../config/env';
import { authRepository } from '../repositories/auth.repository';

let io: Server | null = null;

export function initSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token não fornecido'));
    }

    try {
      const payload = jwt.verify(token, jwtConfig.secret) as { sub: string; email: string };
      const usuario = await authRepository.findUsuarioById(payload.sub);

      if (!usuario) {
        return next(new Error('Usuário não encontrado'));
      }

      (socket as any).usuario = usuario;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const usuario = (socket as any).usuario;
    socket.join(`user:${usuario.id}`);

    socket.on('disconnect', () => {
      socket.leave(`user:${usuario.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado');
  }
  return io;
}
