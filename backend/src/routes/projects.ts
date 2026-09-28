import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as projectService from '../services/projectService';
import * as regulatoryService from '../services/regulatoryService';
import * as dependencyService from '../services/dependencyService';
import * as approvalService from '../services/approvalService';
import * as applicationService from '../services/applicationService';

const router = Router();

router.get('/projects', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.listProjects(req.query.org_id as string | undefined));
  } catch (err) {
    next(err);
  }
});

router.post('/projects', requireAuth, async (req, res, next) => {
  try {
    const org_id = req.body.org_id || req.user?.org_id;
    const payload = {
      ...req.body,
      org_id,
      investment_amount: req.body.investment_amount !== undefined ? Number(req.body.investment_amount) : 0,
      employee_count: req.body.employee_count !== undefined ? Number(req.body.employee_count) : 0,
      target_start_date: req.body.target_start_date ? new Date(req.body.target_start_date) : undefined,
    };
    res.status(201).json(await projectService.createProject(payload));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.getProject(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/profile', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.getProjectProfile(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/projects/:id/profile', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.updateProjectProfile(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch('/projects/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.updateProject(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/attributes', requireAuth, async (req, res, next) => {
  try {
    const attrs = req.body?.attributes && typeof req.body.attributes === 'object' ? req.body.attributes : req.body;
    res.json(await projectService.saveProjectAttributes(req.params.id, attrs));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/regulatory-analysis', requireAuth, async (req, res, next) => {
  try {
    res.json(await regulatoryService.runRegulatoryAnalysis(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/control-centre', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.getControlCentre(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/dependency-graph', requireAuth, async (req, res, next) => {
  try {
    res.json(await dependencyService.getDependencyGraph(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/approvals', requireAuth, async (req, res, next) => {
  try {
    res.json(await approvalService.listProjectApprovals(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/start-eligible-applications', requireAuth, async (req, res, next) => {
  try {
    res.json(await applicationService.startEligibleApplications(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/submission-centre', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.getProjectSubmissionCentre(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/approval-tracker', requireAuth, async (req, res, next) => {
  try {
    const { getProjectApprovalTracker } = await import('../services/approvalTrackerService');
    res.json(await getProjectApprovalTracker(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/submit-application/:applicationId', requireAuth, async (req, res, next) => {
  try {
    const { notes } = req.body || {};
    res.json(
      await projectService.submitProjectApplication(
        req.params.id,
        req.params.applicationId,
        req.user?.id,
        notes
      )
    );
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/document-consistency', requireAuth, async (req, res, next) => {
  try {
    const { checkProjectDocumentConsistency } = await import(
      '../services/crossDocumentConsistencyService'
    );
    res.json(await checkProjectDocumentConsistency(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/document-checklist', requireAuth, async (req, res, next) => {
  try {
    const { getProjectDocumentGuidance } = await import(
      '../services/documentGuidanceService'
    );
    res.json(await getProjectDocumentGuidance(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
