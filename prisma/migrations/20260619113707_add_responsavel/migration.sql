-- DropForeignKey
ALTER TABLE "membros_familia" DROP CONSTRAINT "membros_familia_usuarioId_fkey";

-- AlterTable
ALTER TABLE "membros_familia" ADD COLUMN     "responsavel" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "usuarioId" DROP NOT NULL,
ALTER COLUMN "permissao" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
