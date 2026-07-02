/*
  Warnings:

  - You are about to drop the column `quantidadeExecucoes` on the `agendamentos_tarefa` table. All the data in the column will be lost.
  - Made the column `horario` on table `agendamentos_tarefa` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "agendamentos_tarefa" DROP COLUMN "quantidadeExecucoes",
ALTER COLUMN "diaSemana" DROP NOT NULL,
ALTER COLUMN "horario" SET NOT NULL;
