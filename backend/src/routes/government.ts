import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as analyticsService from '../services/analyticsService';

const router = Router();

router.use(requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN'));

router.get('/work-queue', async (req, res, next) => {
  try {
    res.json(
      await analyticsService.getWorkQueue({
        department_id: req.query.department_id as string | undefined,
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/bottlenecks', async (_req, res, next) => {
  try {
    res.json(await analyticsService.getBottlenecks());
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (_req, res, next) => {
  try {
    res.json(await analyticsService.getAnalyticsSummary());
  } catch (err) {
    next(err);
  }
});

export default router;
