import 'dotenv/config';

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@casaemdia.com',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
