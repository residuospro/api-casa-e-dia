-- CreateEnum
CREATE TYPE "ConviteStatus" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

-- AlterTable
ALTER TABLE "membros_familia" ADD COLUMN     "status" "ConviteStatus" NOT NULL DEFAULT 'PENDENTE';
