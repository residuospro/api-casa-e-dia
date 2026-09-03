import { Router } from 'express';
import { contaController } from '../controllers/financeiro/conta.controller';
import { cartaoController } from '../controllers/financeiro/cartao.controller';
import { categoriaFinanceiraController } from '../controllers/financeiro/categoria-financeira.controller';
import { subcategoriaController } from '../controllers/financeiro/subcategoria.controller';
import { centroCustoController } from '../controllers/financeiro/centro-custo.controller';
import { tagController } from '../controllers/financeiro/tag.controller';
import { lancamentoController } from '../controllers/financeiro/lancamento.controller';
import { recorrenciaFinanceiraController } from '../controllers/financeiro/recorrencia-financeira.controller';
import { metaFinanceiraController } from '../controllers/financeiro/meta-financeira.controller';
import { orcamentoController } from '../controllers/financeiro/orcamento.controller';
import { dashboardController } from '../controllers/financeiro/dashboard.controller';
import { financeiroOpcoesController } from '../controllers/financeiro/financeiro-opcoes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// Opcoes (formularios)
router.get('/:familiaId/financeiro/opcoes', authMiddleware, financeiroOpcoesController.listar);

// Contas
router.post('/:familiaId/financeiro/contas', authMiddleware, contaController.criar);
router.get('/:familiaId/financeiro/contas', authMiddleware, contaController.listar);
router.get('/:familiaId/financeiro/contas/:id', authMiddleware, contaController.obter);
router.put('/:familiaId/financeiro/contas/:id', authMiddleware, contaController.atualizar);
router.delete('/:familiaId/financeiro/contas/:id', authMiddleware, contaController.remover);

// Cartoes
router.post('/:familiaId/financeiro/cartoes', authMiddleware, cartaoController.criar);
router.get('/:familiaId/financeiro/cartoes', authMiddleware, cartaoController.listar);
router.get('/:familiaId/financeiro/cartoes/:id', authMiddleware, cartaoController.obter);
router.put('/:familiaId/financeiro/cartoes/:id', authMiddleware, cartaoController.atualizar);
router.delete('/:familiaId/financeiro/cartoes/:id', authMiddleware, cartaoController.remover);

// Categorias Financeiras
router.post('/:familiaId/financeiro/categorias', authMiddleware, categoriaFinanceiraController.criar);
router.get('/:familiaId/financeiro/categorias', authMiddleware, categoriaFinanceiraController.listar);
router.get('/:familiaId/financeiro/categorias/:id', authMiddleware, categoriaFinanceiraController.obter);
router.put('/:familiaId/financeiro/categorias/:id', authMiddleware, categoriaFinanceiraController.atualizar);
router.delete('/:familiaId/financeiro/categorias/:id', authMiddleware, categoriaFinanceiraController.remover);

// Subcategorias
  router.post('/:familiaId/financeiro/subcategorias', authMiddleware, subcategoriaController.criar);
  router.get('/:familiaId/financeiro/subcategorias', authMiddleware, subcategoriaController.listar);
  router.get('/:familiaId/financeiro/categorias/:categoriaId/subcategorias', authMiddleware, subcategoriaController.listarPorCategoria);
router.get('/:familiaId/financeiro/subcategorias/:id', authMiddleware, subcategoriaController.obter);
router.put('/:familiaId/financeiro/subcategorias/:id', authMiddleware, subcategoriaController.atualizar);
router.delete('/:familiaId/financeiro/subcategorias/:id', authMiddleware, subcategoriaController.remover);

// Centros de Custo
router.post('/:familiaId/financeiro/centros-custo', authMiddleware, centroCustoController.criar);
router.get('/:familiaId/financeiro/centros-custo', authMiddleware, centroCustoController.listar);
router.get('/:familiaId/financeiro/centros-custo/:id', authMiddleware, centroCustoController.obter);
router.put('/:familiaId/financeiro/centros-custo/:id', authMiddleware, centroCustoController.atualizar);
router.delete('/:familiaId/financeiro/centros-custo/:id', authMiddleware, centroCustoController.remover);

// Tags
router.post('/:familiaId/financeiro/tags', authMiddleware, tagController.criar);
router.get('/:familiaId/financeiro/tags', authMiddleware, tagController.listar);
router.get('/:familiaId/financeiro/tags/:id', authMiddleware, tagController.obter);
router.put('/:familiaId/financeiro/tags/:id', authMiddleware, tagController.atualizar);
router.delete('/:familiaId/financeiro/tags/:id', authMiddleware, tagController.remover);

// Lancamentos (resumos e agrupamentos antes de /:id para nao colidir)
router.post('/:familiaId/financeiro/lancamentos', authMiddleware, lancamentoController.criar);
router.get('/:familiaId/financeiro/lancamentos', authMiddleware, lancamentoController.listar);
router.get('/:familiaId/financeiro/lancamentos/resumo', authMiddleware, lancamentoController.resumo);
router.get('/:familiaId/financeiro/lancamentos/agrupamentos/categoria', authMiddleware, lancamentoController.agruparPorCategoria);
router.get('/:familiaId/financeiro/lancamentos/agrupamentos/conta', authMiddleware, lancamentoController.agruparPorConta);
router.get('/:familiaId/financeiro/lancamentos/agrupamentos/forma-pagamento', authMiddleware, lancamentoController.agruparPorFormaPagamento);
router.get('/:familiaId/financeiro/lancamentos/agrupamentos/periodo', authMiddleware, lancamentoController.agruparPorPeriodo);
router.get('/:familiaId/financeiro/lancamentos/:id', authMiddleware, lancamentoController.obter);
router.put('/:familiaId/financeiro/lancamentos/:id', authMiddleware, lancamentoController.atualizar);
router.patch('/:familiaId/financeiro/lancamentos/:id/status', authMiddleware, lancamentoController.alterarStatus);
router.delete('/:familiaId/financeiro/lancamentos/:id', authMiddleware, lancamentoController.remover);

// Recorrencias Financeiras
router.post('/:familiaId/financeiro/recorrencias', authMiddleware, recorrenciaFinanceiraController.criar);
router.get('/:familiaId/financeiro/recorrencias', authMiddleware, recorrenciaFinanceiraController.listar);
router.get('/:familiaId/financeiro/recorrencias/:id/ocorrencias', authMiddleware, recorrenciaFinanceiraController.listarOcorrencias);
router.post('/:familiaId/financeiro/recorrencias/:id/executar', authMiddleware, recorrenciaFinanceiraController.executarManual);
router.get('/:familiaId/financeiro/recorrencias/:id', authMiddleware, recorrenciaFinanceiraController.obter);
router.put('/:familiaId/financeiro/recorrencias/:id', authMiddleware, recorrenciaFinanceiraController.atualizar);
router.patch('/:familiaId/financeiro/recorrencias/:id/status', authMiddleware, recorrenciaFinanceiraController.alterarStatus);
router.delete('/:familiaId/financeiro/recorrencias/:id', authMiddleware, recorrenciaFinanceiraController.remover);

// Metas Financeiras
router.post('/:familiaId/financeiro/metas', authMiddleware, metaFinanceiraController.criar);
router.get('/:familiaId/financeiro/metas', authMiddleware, metaFinanceiraController.listar);
router.patch('/:familiaId/financeiro/metas/:id/cancelar', authMiddleware, metaFinanceiraController.cancelar);
router.patch('/:familiaId/financeiro/metas/:id/concluir', authMiddleware, metaFinanceiraController.concluir);
router.post('/:familiaId/financeiro/metas/:id/movimentacoes', authMiddleware, metaFinanceiraController.registrarMovimentacao);
router.get('/:familiaId/financeiro/metas/:id/historicos', authMiddleware, metaFinanceiraController.listarMovimentacoes);
router.get('/:familiaId/financeiro/metas/:id', authMiddleware, metaFinanceiraController.obter);
router.put('/:familiaId/financeiro/metas/:id', authMiddleware, metaFinanceiraController.atualizar);
router.delete('/:familiaId/financeiro/metas/:id', authMiddleware, metaFinanceiraController.remover);

// Orcamentos Financeiros (resumo antes de /:id para nao colidir)
router.post('/:familiaId/financeiro/orcamentos', authMiddleware, orcamentoController.criar);
router.get('/:familiaId/financeiro/orcamentos', authMiddleware, orcamentoController.listar);
router.get('/:familiaId/financeiro/orcamentos/resumo', authMiddleware, orcamentoController.resumo);
router.get('/:familiaId/financeiro/orcamentos/:id', authMiddleware, orcamentoController.obter);
router.put('/:familiaId/financeiro/orcamentos/:id', authMiddleware, orcamentoController.atualizar);
router.delete('/:familiaId/financeiro/orcamentos/:id', authMiddleware, orcamentoController.remover);

// Graficos / Dashboard
router.get('/:familiaId/financeiro/graficos/fluxo-caixa', authMiddleware, dashboardController.fluxoCaixa);
router.get('/:familiaId/financeiro/graficos/evolucao-patrimonio', authMiddleware, dashboardController.evolucaoPatrimonio);
router.get('/:familiaId/financeiro/graficos/despesas-por-categoria', authMiddleware, dashboardController.despesasPorCategoria);
router.get('/:familiaId/financeiro/graficos/metas-progresso', authMiddleware, dashboardController.metasProgresso);
router.get('/:familiaId/financeiro/graficos/orcamentos-resumo', authMiddleware, dashboardController.orcamentosResumo);
router.get('/:familiaId/financeiro/graficos/saldo-contas', authMiddleware, dashboardController.saldoContas);
router.get('/:familiaId/financeiro/graficos/gastos-por-responsavel', authMiddleware, dashboardController.gastosPorResponsavel);

export default router;
