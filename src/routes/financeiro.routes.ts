import { Router } from 'express';
import { contaController } from '../controllers/financeiro/conta.controller';
import { cartaoController } from '../controllers/financeiro/cartao.controller';
import { categoriaFinanceiraController } from '../controllers/financeiro/categoria-financeira.controller';
import { subcategoriaController } from '../controllers/financeiro/subcategoria.controller';
import { centroCustoController } from '../controllers/financeiro/centro-custo.controller';
import { tagController } from '../controllers/financeiro/tag.controller';
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

export default router;
