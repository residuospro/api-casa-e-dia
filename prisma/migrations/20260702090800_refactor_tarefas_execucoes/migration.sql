-- CreateEnum
CREATE TYPE "StatusExecucao" AS ENUM ('AGENDADA', 'CONCLUIDA', 'ATRASADA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "agendamentos_tarefa" DROP CONSTRAINT "agendamentos_tarefa_tarefaId_fkey";

-- DropForeignKey
ALTER TABLE "execucoes_tarefa" DROP CONSTRAINT "execucoes_tarefa_membroId_fkey";

-- AlterTable: remove old columns, add new ones (data gets a temp default for existing rows)
ALTER TABLE "execucoes_tarefa" DROP COLUMN "concluida",
DROP COLUMN "dataExecucao",
DROP COLUMN "membroId",
DROP COLUMN "observacao",
DROP COLUMN "pontosGerados",
ADD COLUMN "concluidoEm" TIMESTAMP(3),
ADD COLUMN "concluidoPorId" TEXT,
ADD COLUMN "data" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
ADD COLUMN "notificacaoCriada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pontosObtidos" INTEGER,
ADD COLUMN "status" "StatusExecucao" NOT NULL DEFAULT 'AGENDADA';

ALTER TABLE "execucoes_tarefa" ALTER COLUMN "data" DROP DEFAULT;

-- DropTable
DROP TABLE "agendamentos_tarefa";

-- AddForeignKey
ALTER TABLE "execucoes_tarefa" ADD CONSTRAINT "execucoes_tarefa_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "membros_familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
