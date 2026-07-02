-- AlterTable
ALTER TABLE "tarefas" ADD COLUMN     "cicloId" TEXT;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
