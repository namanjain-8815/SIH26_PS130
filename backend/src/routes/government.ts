import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as analyticsService from '../services/analyticsService';
import * as slaService from '../services/slaService';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN'));

function sanitizeParam(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const t = val.trim();
  return !t || t === 'undefined' || t === 'null' || t === 'ALL' ? undefined : t;
}

router.get('/work-queue', async (req, res, next) => {
  try {
    res.json(
      await analyticsService.getWorkQueue({
        department_id: sanitizeParam(req.query.department_id),
        status: sanitizeParam(req.query.status),
        priority: sanitizeParam(req.query.priority),
        district: sanitizeParam(req.query.district),
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
router.get('/sla-monitor', async (req, res, next) => {
  try {
    res.json(
      await slaService.getGovernmentSLAMonitor(
        sanitizeParam(req.query.department_id)
      )
    );
  } catch (err) {
    next(err);
  }
});

router.get('/departments', async (_req, res, next) => {
  try {
    const depts = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(depts);
  } catch (err) {
    next(err);
  }
});

export default router;
