-- CreateEnum
CREATE TYPE "NotificacaoTipo" AS ENUM ('CONVITE_FAMILIA');

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "NotificacaoTipo" NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "dados" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
