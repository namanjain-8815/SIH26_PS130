import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as complianceService from '../services/complianceService';

const router = Router();

// Existing compliance endpoint (enhanced with categories)
router.get('/projects/:id/compliance', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.listProjectCompliance(req.params.id));
  } catch (err) {
    next(err);
  }
});

// P1.11 — Comprehensive Statutory Renewals Workspace
router.get('/projects/:id/renewals-workspace', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.getProjectRenewalsWorkspace(req.params.id));
  } catch (err) {
    next(err);
  }
});

// P1.11 — Single Renewal Detailed View
router.get('/compliance/:id/detail', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.getRenewalDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

// P1.11 — Prepare Renewal Flow with Reused Project Information
router.post('/compliance/:id/prepare-renewal', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json(await complianceService.prepareRenewal(req.params.id, req.user?.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/compliance/:id/complete', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.markComplianceCompleted(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/compliance/remind', requireAuth, async (req, res, next) => {
  try {
    res.json(await complianceService.sendComplianceReminders(req.params.id, req.user!.id));
  } catch (err) {
    next(err);
  }
});

export default router;
