-- CreateEnum
CREATE TYPE "TipoTarefa" AS ENUM ('PESSOAL', 'FAMILIAR');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('CASA', 'ESTUDO', 'SAUDE', 'FINANCEIRO', 'OUTROS');

-- CreateEnum
CREATE TYPE "ModoDistribuicao" AS ENUM ('FIXA', 'REVEZAMENTO');

-- CreateTable
CREATE TABLE "ciclos" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "duracaoDias" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciclos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamificacoes" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoTarefa" NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "modoDistribuicao" "ModoDistribuicao",
    "responsavelAtualId" TEXT,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos_tarefa" (
    "id" TEXT NOT NULL,
    "tarefaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horario" TEXT,
    "quantidadeExecucoes" INTEGER,

    CONSTRAINT "agendamentos_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucoes_tarefa" (
    "id" TEXT NOT NULL,
    "tarefaId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "dataExecucao" TIMESTAMP(3) NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "pontosGerados" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execucoes_tarefa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamificacoes" ADD CONSTRAINT "gamificacoes_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavelAtualId_fkey" FOREIGN KEY ("responsavelAtualId") REFERENCES "membros_familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "membros_familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_tarefa" ADD CONSTRAINT "agendamentos_tarefa_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_tarefa" ADD CONSTRAINT "execucoes_tarefa_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_tarefa" ADD CONSTRAINT "execucoes_tarefa_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "membros_familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
