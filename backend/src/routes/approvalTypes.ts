import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as approvalService from '../services/approvalService';

const router = Router();

router.get('/approval-types', requireAuth, async (_req, res, next) => {
  try {
    res.json(await approvalService.listApprovalTypes());
  } catch (err) {
    next(err);
  }
});

router.get('/approval-types/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await approvalService.getApprovalType(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
