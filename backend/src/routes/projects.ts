import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as projectService from '../services/projectService';
import * as regulatoryService from '../services/regulatoryService';
import * as dependencyService from '../services/dependencyService';
import * as approvalService from '../services/approvalService';

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
    res.status(201).json(await projectService.createProject(req.body));
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

router.patch('/projects/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.updateProject(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/attributes', requireAuth, async (req, res, next) => {
  try {
    res.json(await projectService.saveProjectAttributes(req.params.id, req.body));
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

export default router;
