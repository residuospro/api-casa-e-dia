-- CreateTable
CREATE TABLE "scheduler_logs" (
    "id" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'AGENDADO',
    "status" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEm" TIMESTAMP(3),
    "duracaoMs" INTEGER,
    "detalhes" JSONB,
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduler_logs_identificador_criadoEm_idx" ON "scheduler_logs"("identificador", "criadoEm");