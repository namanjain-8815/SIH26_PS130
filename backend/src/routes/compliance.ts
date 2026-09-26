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

export default router;
