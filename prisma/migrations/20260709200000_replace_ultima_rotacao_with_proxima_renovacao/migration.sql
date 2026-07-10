-- AlterTable: replace ultimaRotacao with proximaRenovacao
ALTER TABLE "ciclos" DROP COLUMN "ultimaRotacao";
ALTER TABLE "ciclos" ADD COLUMN "proximaRenovacao" TIMESTAMP(3);
