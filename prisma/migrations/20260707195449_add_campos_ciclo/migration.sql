-- AlterTable
ALTER TABLE "ciclos" ADD COLUMN     "participantes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "renovacaoAutomatica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revezamentoAutomatico" BOOLEAN NOT NULL DEFAULT false;
