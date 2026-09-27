import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as complianceService from '../services/complianceService';

const router = Router();

router.get('/projects/:id/compliance', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.listProjectCompliance(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/compliance/:id/complete', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.markComplianceCompleted(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/compliance/remind', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.sendComplianceReminders(req.params.id, req.user!.id));
  } catch (err) {
    next(err);
  }
});

export default router;
