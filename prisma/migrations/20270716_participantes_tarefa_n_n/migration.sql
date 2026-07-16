-- CreateTable
CREATE TABLE "participantes_tarefa" (
    "id" TEXT NOT NULL,
    "tarefaId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participantes_tarefa_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from participanteId
INSERT INTO "participantes_tarefa" ("id", "tarefaId", "membroId", "criadoEm")
SELECT
    'pt_' || "id",
    "id",
    "participanteId",
    NOW()
FROM "tarefas"
WHERE "participanteId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "participantes_tarefa_tarefaId_membroId_key" ON "participantes_tarefa"("tarefaId", "membroId");

-- CreateIndex
CREATE INDEX "participantes_tarefa_tarefaId_idx" ON "participantes_tarefa"("tarefaId");

-- CreateIndex
CREATE INDEX "participantes_tarefa_membroId_idx" ON "participantes_tarefa"("membroId");

-- AddForeignKey
ALTER TABLE "participantes_tarefa" ADD CONSTRAINT "participantes_tarefa_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_tarefa" ADD CONSTRAINT "participantes_tarefa_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "membros_familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "tarefas" DROP CONSTRAINT "tarefas_participanteId_fkey";

-- DropIndex
DROP INDEX "tarefas_participanteId_idx";

-- AlterTable
ALTER TABLE "tarefas" DROP COLUMN "participanteId";
