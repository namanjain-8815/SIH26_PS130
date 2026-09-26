import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as slaService from '../services/slaService';

const router = Router();

router.get('/projects/:id/sla-status', requireAuth, async (req, res, next) => {
  try {
    res.json(await slaService.getProjectSLAStatus(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/government/sla-monitor', requireAuth, async (req, res, next) => {
  try {
    res.json(await slaService.getGovernmentSLAMonitor(req.query.department_id as string | undefined));
  } catch (err) {
    next(err);
  }
});

export default router;
