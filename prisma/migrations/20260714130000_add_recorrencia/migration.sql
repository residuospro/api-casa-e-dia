-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('DIARIO', 'DIA_SIM_DIA_NAO', 'DIAS_IMPARES', 'DIAS_PARES');

-- AlterTable
ALTER TABLE "tarefas" ADD COLUMN "recorrencia" JSONB;
