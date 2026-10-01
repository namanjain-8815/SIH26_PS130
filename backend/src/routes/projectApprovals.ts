import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as approvalService from '../services/approvalService';

const router = Router();

router.get('/project-approvals/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await approvalService.getProjectApprovalDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
