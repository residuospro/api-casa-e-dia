-- AlterTable
ALTER TABLE "tarefas" ADD COLUMN "participanteId" TEXT;

-- AlterTable
ALTER TABLE "execucoes_tarefa" ADD COLUMN "executorId" TEXT;

-- CreateIndex
CREATE INDEX "tarefas_participanteId_idx" ON "tarefas"("participanteId");

-- CreateIndex
CREATE INDEX "execucoes_tarefa_executorId_idx" ON "execucoes_tarefa"("executorId");

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "membros_familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_tarefa" ADD CONSTRAINT "execucoes_tarefa_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "membros_familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
