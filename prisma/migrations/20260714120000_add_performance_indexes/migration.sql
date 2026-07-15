-- CreateIndex
CREATE INDEX "tarefas_familiaId_ativo_idx" ON "tarefas"("familiaId", "ativo");

-- CreateIndex
CREATE INDEX "tarefas_cicloId_idx" ON "tarefas"("cicloId");

-- CreateIndex
CREATE INDEX "tarefas_responsavelAtualId_idx" ON "tarefas"("responsavelAtualId");

-- CreateIndex
CREATE INDEX "execucoes_tarefa_tarefaId_idx" ON "execucoes_tarefa"("tarefaId");

-- CreateIndex
CREATE INDEX "execucoes_tarefa_status_data_idx" ON "execucoes_tarefa"("status", "data");
