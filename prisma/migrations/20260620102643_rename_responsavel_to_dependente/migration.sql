/*
  Warnings:

  - You are about to drop the column `responsavel` on the `membros_familia` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "membros_familia" DROP COLUMN "responsavel",
ADD COLUMN     "dependente" BOOLEAN NOT NULL DEFAULT false;
