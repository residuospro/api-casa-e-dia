-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMININO');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "genero" "Genero";
