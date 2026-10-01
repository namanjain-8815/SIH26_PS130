import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as incentiveService from '../services/incentiveService';

const router = Router();

router.get('/projects/:id/incentives', requireAuth, async (req, res, next) => {
  try {
    res.json(await incentiveService.listProjectIncentives(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/incentives/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body as { status: 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'APPLIED' };
    res.json(await incentiveService.updateIncentiveMatchStatus(req.params.id, status));
  } catch (err) {
    next(err);
  }
});

router.get('/incentive-schemes', requireAuth, async (req, res, next) => {
  try {
    res.json(await incentiveService.listAllIncentiveSchemes());
  } catch (err) {
    next(err);
  }
});

export default router;
