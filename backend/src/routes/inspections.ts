import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as inspectionService from '../services/inspectionService';

const router = Router();

router.get('/projects/:id/inspections', requireAuth, async (req, res, next) => {
  try {
    res.json(await inspectionService.listProjectInspections(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/joint-inspections', requireAuth, async (req, res, next) => {
  try {
    res.json(await inspectionService.getProjectJointInspections(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/inspections/joint-plans', requireAuth, async (req, res, next) => {
  try {
    const plans = await inspectionService.listJointInspectionPlans({
      project_id: req.query.project_id as string | undefined,
      district: req.query.district as string | undefined,
      status: req.query.status as string | undefined,
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
    });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

router.post('/inspections/joint-schedule', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL'), async (req, res, next) => {
  try {
    const result = await inspectionService.scheduleJointInspection(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/inspections/joint-reschedule', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL'), async (req, res, next) => {
  try {
    const result = await inspectionService.rescheduleJointInspection(req.body, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/inspections/joint-readiness', requireAuth, async (req, res, next) => {
  try {
    const result = await inspectionService.confirmJointReadiness(req.body, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/inspections', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL'), async (req, res, next) => {
  try {
    res.status(201).json(await inspectionService.scheduleInspection(req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/inspections', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN', 'NODAL'), async (req, res, next) => {
  try {
    res.status(201).json(await inspectionService.scheduleInspection(req.body));
  } catch (err) {
    next(err);
  }
});

// Common Inspection Planner & Officer/Inspector view: GET /api/inspections
router.get('/inspections', requireAuth, async (req, res, next) => {
  try {
    const inspectorId = req.query.inspector_id as string | undefined;
    const departmentId = req.query.department_id as string | undefined;
    const status = req.query.status as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    let effectiveInspectorId = inspectorId;
    if (req.user?.role === 'INSPECTOR' && !effectiveInspectorId && !departmentId) {
      effectiveInspectorId = req.user.id;
    }

    let effectiveDeptId = departmentId;
    if (req.user?.role === 'OFFICER' && !effectiveDeptId && req.user.department_id) {
      effectiveDeptId = req.user.department_id;
    }

    res.json(
      await inspectionService.listPlannerInspections({
        inspector_id: effectiveInspectorId,
        department_id: effectiveDeptId,
        status,
        date_from: dateFrom,
        date_to: dateTo,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/inspectors', requireAuth, async (_req, res, next) => {
  try {
    res.json(await inspectionService.listInspectors());
  } catch (err) {
    next(err);
  }
});

router.patch('/inspections/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.body.status === 'COMPLETED' && !['OFFICER', 'INSPECTOR', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Only Designated Inspection Officers or Competent Authority Officers can complete inspections.' });
    }
    res.json(await inspectionService.updateInspection(req.params.id, req.user!.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/inspections/:id/findings', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN'), async (req, res, next) => {
  try {
    res.status(201).json(await inspectionService.recordFinding(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch('/inspections/findings/:findingId', requireAuth, requireRole('OFFICER', 'INSPECTOR', 'ADMIN'), async (req, res, next) => {
  try {
    res.json(await inspectionService.updateFinding(req.params.findingId, req.user!.id, req.body));
  } catch (err) {
    next(err);
  }
});

export default router;
