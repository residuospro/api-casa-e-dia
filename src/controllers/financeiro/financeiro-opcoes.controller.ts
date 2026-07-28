import { Response, NextFunction } from 'express';
import { contaRepository } from '../../repositories/financeiro/conta.repository';
import { cartaoRepository } from '../../repositories/financeiro/cartao.repository';
import { categoriaFinanceiraRepository } from '../../repositories/financeiro/categoria-financeira.repository';
import { centroCustoRepository } from '../../repositories/financeiro/centro-custo.repository';
import { tagRepository } from '../../repositories/financeiro/tag.repository';
import { familyRepository } from '../../repositories/family.repository';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const financeiroOpcoesController = {
  async listar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { familiaId } = req.params;

      const membro = await familyRepository.findMembroByUsuarioAndFamilia(req.usuario!.id, familiaId);
      if (!membro) {
        res.status(403).json({ error: 'Forbidden', message: 'Voce nao e membro desta familia' });
        return;
      }

      const [contas, cartoes, categorias, centrosCusto, tags] = await Promise.all([
        contaRepository.findByFamilia(familiaId),
        cartaoRepository.findByFamilia(familiaId),
        categoriaFinanceiraRepository.findAtivasByFamilia(familiaId),
        centroCustoRepository.findByFamilia(familiaId),
        tagRepository.findByFamilia(familiaId),
      ]);

      res.json({ contas, cartoes, categorias, centrosCusto, tags });
    } catch (err) {
      next(err);
    }
  },
};
