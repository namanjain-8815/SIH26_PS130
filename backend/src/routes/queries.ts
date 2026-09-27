import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as queryService from '../services/queryService';

const router = Router();

router.get('/applications/:id/queries', requireAuth, async (req, res, next) => {
  try {
    res.json(await queryService.listQueries(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/applications/:id/queries', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL'), async (req, res, next) => {
  try {
    res.status(201).json(await queryService.raiseQuery(req.params.id, req.user!.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/queries/:id/respond', requireAuth, async (req, res, next) => {
  try {
    const { response_text } = req.body as { response_text: string };
    res.status(201).json(await queryService.respondToQuery(req.params.id, req.user!.id, response_text));
  } catch (err) {
    next(err);
  }
});

router.patch('/queries/:id/status', requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN'), async (req, res, next) => {
  try {
    res.json(await queryService.updateQueryStatus(req.params.id, req.user!.id, req.body.status));
  } catch (err) {
    next(err);
  }
});

export default router;
