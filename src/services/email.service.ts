import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: false,
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
});

export async function sendInviteEmail(
  to: string,
  nome: string,
  nomeFamilia: string,
) {
  const link = `${env.frontendUrl}/convites`;

  const info = await transporter.sendMail({
    from: env.email.from,
    to,
    subject: `Você foi convidado para a família ${nomeFamilia}`,
    html: `
      <h2>Olá, ${nome}!</h2>
      <p>Você foi convidado(a) para fazer parte da família <strong>${nomeFamilia}</strong>.</p>
      <p>Clique no link abaixo para ver seus convites:</p>
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Ver Convites</a>
    `,
  });

  console.log(`Convite enviado para ${to}: ${info.messageId}`);
}
