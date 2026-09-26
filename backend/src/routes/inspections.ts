import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as inspectionService from '../services/inspectionService';

const router = Router();

router.get('/projects/:id/inspections', requireAuth, async (req, res, next) => {
  try {
    res.json(await inspectionService.listProjectInspections(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/inspections', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json(await inspectionService.scheduleInspection(req.body));
  } catch (err) {
    next(err);
  }
});

// Officer/inspector view per contract: GET /api/inspections?inspector_id=
router.get('/inspections', requireAuth, async (req, res, next) => {
  try {
    const inspectorId = req.query.inspector_id as string | undefined;
    res.json(inspectorId ? await inspectionService.listInspectorInspections(inspectorId) : []);
  } catch (err) {
    next(err);
  }
});

router.patch('/inspections/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await inspectionService.updateInspection(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/inspections/:id/findings', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json(await inspectionService.recordFinding(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

export default router;
