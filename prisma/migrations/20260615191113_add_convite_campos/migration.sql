-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tokenExpiraEm" TIMESTAMP(3),
ADD COLUMN     "tokenPrimeiroAcesso" TEXT;
