import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as slaService from '../services/slaService';

const router = Router();

router.get('/projects/:id/sla-status', requireAuth, async (req, res, next) => {
  try {
    res.json(await slaService.getProjectSLAStatus(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/government/sla-monitor', requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    res.json(await slaService.getGovernmentSLAMonitor(req.query.department_id as string | undefined));
  } catch (err) {
    next(err);
  }
});

router.post('/government/sla-monitor/evaluate', requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    res.json(await slaService.evaluateAndNotifySLAs());
  } catch (err) {
    next(err);
  }
});

export default router;
