const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
process.env.DATABASE_URL =
  'postgresql://casa-em-dia-user:20172023@localhost:5433/casa-em-dia-db';
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const { PrismaClient } = require('./src/generated/prisma-client');
const p = new PrismaClient();

(async () => {
  const ids = [
    'cmro3sxe0000s1vexf2mlob9z',
    'cmrms60u0000lw54suhte8p3w',
    'cmrmo2m9n0001antyzp4r43jy',
  ];

  for (const id of ids) {
    const t = await p.tarefa.findUnique({
      where: { id },
      include: {
        ciclo: true,
        execucoes: { orderBy: { data: 'asc' }, select: { id: true, data: true, status: true, iteracao: true } },
      },
    });
    console.log('=== TAREFA', id, '===');
    if (!t) {
      console.log('NAO ENCONTRADA');
      continue;
    }
    console.log('titulo:', t.titulo, '| ativo:', t.ativo, '| cicloId:', t.cicloId, '| cicloIteracao:', t.cicloIteracao);
    console.log('recorrencia:', JSON.stringify(t.recorrencia));
    if (t.ciclo) {
      console.log('ciclo:', JSON.stringify({
        ativo: t.ciclo.ativo,
        inicio: t.ciclo.inicio,
        duracaoDias: t.ciclo.duracaoDias,
        iteracao: t.ciclo.iteracao,
        renovadoEm: t.ciclo.renovadoEm,
        proximaRenovacao: t.ciclo.proximaRenovacao,
        renovacaoAutomatica: t.ciclo.renovacaoAutomatica,
        revezamentoAutomatico: t.ciclo.revezamentoAutomatico,
        expirado: t.ciclo.expirado,
      }));
    }
    console.log('execucoes:');
    const agora = new Date();
    let futuras = 0;
    for (const e of t.execucoes) {
      if (e.status === 'AGENDADA' && e.data >= agora) futuras++;
      console.log(' ', e.id, '|', e.data.toISOString(), '|', e.status, '| iteracao', e.iteracao);
    }
    console.log('-> AGENDADA futuras:', futuras);
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error('ERRO:', e);
  process.exit(1);
});