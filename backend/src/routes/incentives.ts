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

export default router;
