import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.ciclo.deleteMany();
  await prisma.gamificacao.deleteMany();
  await prisma.execucaoTarefa.deleteMany();
  await prisma.agendamentoTarefa.deleteMany();
  await prisma.tarefa.deleteMany();

  const familia = await prisma.familia.findFirst();
  if (!familia) {
    console.log('Nenhuma família encontrada. Execute o seed após criar uma família.');
    return;
  }

  const membros = await prisma.membroFamilia.findMany({
    where: { familiaId: familia.id },
  });

  if (membros.length === 0) {
    console.log('Nenhum membro encontrado na família.');
    return;
  }

  const admin = membros[0];

  const ciclo = await prisma.ciclo.create({
    data: {
      familiaId: familia.id,
      nome: 'Revezamento Semanal',
      descricao: 'Ciclo de revezamento semanal de tarefas domésticas',
      duracaoDias: 7,
      ativo: true,
    },
  });
  console.log(`Ciclo criado: ${ciclo.nome}`);

  const gamificacao = await prisma.gamificacao.create({
    data: {
      familiaId: familia.id,
      nome: 'Gamificação Familiar',
      ativo: true,
      inicio: new Date(),
    },
  });
  console.log(`Gamificação criada: ${gamificacao.nome}`);

  const tarefasData = [
    {
      titulo: 'Lavar louça',
      descricao: 'Lavar e guardar toda a louça do dia',
      tipo: 'FAMILIAR' as const,
      categoria: 'CASA' as const,
      modoDistribuicao: 'REVEZAMENTO' as const,
      pontos: 10,
      responsavelAtualId: admin.id,
    },
    {
      titulo: 'Varrer a casa',
      descricao: 'Varrer todos os cômodos',
      tipo: 'FAMILIAR' as const,
      categoria: 'CASA' as const,
      modoDistribuicao: 'FIXA' as const,
      pontos: 8,
      responsavelAtualId: admin.id,
    },
    {
      titulo: 'Estudar matemática',
      descricao: 'Estudar por pelo menos 1 hora',
      tipo: 'PESSOAL' as const,
      categoria: 'ESTUDO' as const,
      pontos: 15,
      responsavelAtualId: admin.id,
    },
    {
      titulo: 'Cuidar das plantas',
      descricao: 'Regar e cuidar das plantas da casa',
      tipo: 'FAMILIAR' as const,
      categoria: 'CASA' as const,
      modoDistribuicao: 'REVEZAMENTO' as const,
      pontos: 5,
      responsavelAtualId: admin.id,
    },
    {
      titulo: 'Fazer exercícios',
      descricao: 'Pelo menos 30 minutos de atividade física',
      tipo: 'PESSOAL' as const,
      categoria: 'SAUDE' as const,
      pontos: 20,
      responsavelAtualId: admin.id,
    },
  ];

  for (const t of tarefasData) {
    const tarefa = await prisma.tarefa.create({
      data: {
        familiaId: familia.id,
        titulo: t.titulo,
        descricao: t.descricao,
        tipo: t.tipo,
        categoria: t.categoria,
        modoDistribuicao: t.modoDistribuicao ?? null,
        pontos: t.pontos,
        responsavelAtualId: t.responsavelAtualId,
        criadoPorId: admin.id,
        agendamentos: {
          create: [
            { diaSemana: 1, horario: '08:00' },
            { diaSemana: 3, horario: '08:00' },
            { diaSemana: 5, horario: '08:00' },
          ],
        },
      },
    });
    console.log(`Tarefa criada: ${tarefa.titulo} (${tarefa.id})`);
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
