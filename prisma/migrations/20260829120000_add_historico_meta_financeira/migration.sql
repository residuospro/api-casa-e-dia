-- CreateEnum
CREATE TYPE "TipoMovimentacaoMeta" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "historico_meta_financeira" (
    "id" TEXT NOT NULL,
    "metaFinanceiraId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoMeta" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "saldoAnterior" DECIMAL(12,2) NOT NULL,
    "saldoNovo" DECIMAL(12,2) NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_meta_financeira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_meta_financeira_metaFinanceiraId_idx" ON "historico_meta_financeira"("metaFinanceiraId");

-- CreateIndex
CREATE INDEX "historico_meta_financeira_usuarioId_idx" ON "historico_meta_financeira"("usuarioId");

-- AddForeignKey
ALTER TABLE "historico_meta_financeira" ADD CONSTRAINT "historico_meta_financeira_metaFinanceiraId_fkey" FOREIGN KEY ("metaFinanceiraId") REFERENCES "metas_financeira"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_meta_financeira" ADD CONSTRAINT "historico_meta_financeira_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;