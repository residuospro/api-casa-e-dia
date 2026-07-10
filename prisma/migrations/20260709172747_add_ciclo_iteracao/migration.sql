-- AlterTable
ALTER TABLE "ciclos" ADD COLUMN     "iteracao" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tarefas" ADD COLUMN     "cicloIteracao" INTEGER;
