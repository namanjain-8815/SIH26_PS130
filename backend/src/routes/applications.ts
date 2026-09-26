import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as applicationService from '../services/applicationService';

const router = Router();

router.get('/projects/:id/applications', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.listApplications(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/applications', requireAuth, async (req, res, next) => {
  try {
    const { project_approval_id, department_id } = req.body as {
      project_approval_id: string;
      department_id: string;
    };
    res.status(201).json(await applicationService.createApplication(project_approval_id, department_id));
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.getApplication(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/applications/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status, notes } = req.body as { status: string; notes?: string };
    res.json(await applicationService.updateApplicationStatus(req.params.id, status, req.user?.id, notes));
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id/timeline', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.getApplicationTimeline(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/applications/:id/readiness-check', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.runReadinessCheck(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
