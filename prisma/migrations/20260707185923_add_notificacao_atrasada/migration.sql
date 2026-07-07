-- AlterEnum
ALTER TYPE "NotificacaoTipo" ADD VALUE 'EXECUCAO_TAREFA';

-- AlterTable
ALTER TABLE "execucoes_tarefa" ADD COLUMN     "notificacaoAtrasada" BOOLEAN NOT NULL DEFAULT false;
