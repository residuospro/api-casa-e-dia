import { env } from './env';

export const jwtConfig = {
  secret: env.jwtSecret,
  expiresIn: '7d',
};
