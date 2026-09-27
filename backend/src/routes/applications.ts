import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
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

router.get('/applications/:id/scrutiny-priority', requireAuth, async (req, res, next) => {
  try {
    const { getApplicationScrutinyPriority } = await import('../services/scrutinyPriorityService');
    res.json(await getApplicationScrutinyPriority(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id/external-status', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.getSimulatedGatewayStatus(req.params.id));
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

router.post('/applications/:id/coordination-note', requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    const { note, notes, event_type } = req.body as { note?: string; notes?: string; event_type?: string };
    const content = note || notes || 'Inter-department coordination note recorded';
    res.status(201).json(
      await applicationService.recordCoordinationNote(
        req.params.id,
        req.user!.id,
        content,
        event_type || 'nodal_coordination_note'
      )
    );
  } catch (err) {
    next(err);
  }
});

router.post('/applications/:id/escalate', requireAuth, requireRole('OFFICER', 'NODAL', 'ADMIN', 'ENTREPRENEUR'), async (req, res, next) => {
  try {
    const { reason } = req.body as { reason?: string };
    res.status(200).json(
      await applicationService.escalateApplication(req.params.id, req.user!.id, reason)
    );
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

router.post('/applications', requireAuth, async (req, res, next) => {
  try {
    const { project_approval_id, department_id } = req.body as {
      project_approval_id: string;
      department_id?: string;
    };
    res.status(201).json(await applicationService.createApplication(project_approval_id, department_id));
  } catch (err) {
    next(err);
  }
});

router.post('/applications/:id/documents', requireAuth, async (req, res, next) => {
  try {
    const { document_id } = req.body as { document_id: string };
    res.status(201).json(await applicationService.attachDocument(req.params.id, document_id));
  } catch (err) {
    next(err);
  }
});

router.delete('/applications/:id/documents/:docId', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.detachDocument(req.params.id, req.params.docId));
  } catch (err) {
    next(err);
  }
});

export default router;
