-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('MARIDO', 'ESPOSA', 'FILHO', 'FILHA', 'OUTRO');

-- CreateEnum
CREATE TYPE "Permissao" AS ENUM ('ADMIN', 'USUARIO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "familias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "familias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_familia" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "permissao" "Permissao" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_familia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
