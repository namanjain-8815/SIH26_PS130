import { Router } from 'express';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import * as approvalService from '../services/approvalService';
import {
  listPrescribedForms,
  getPrescribedFormById,
  getPrescribedFormForApproval,
} from '../services/prescribedFormService';

const router = Router();

router.get('/approval-types', requireAuth, async (_req, res, next) => {
  try {
    res.json(await approvalService.listApprovalTypes());
  } catch (err) {
    next(err);
  }
});

router.get('/prescribed-forms', requireAuth, async (_req, res, next) => {
  try {
    res.json(listPrescribedForms());
  } catch (err) {
    next(err);
  }
});

router.get('/prescribed-forms/:id', requireAuth, async (req, res, next) => {
  try {
    const form = getPrescribedFormById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Prescribed form not found' });
    }
    res.json(form);
  } catch (err) {
    next(err);
  }
});

router.get('/prescribed-forms/:id/download', requireAuth, async (req, res, next) => {
  try {
    const form = getPrescribedFormById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Prescribed form not found' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${form.file_name}"`);
    res.setHeader('Content-Type', form.mime_type);

    if (form.file_path && fs.existsSync(form.file_path)) {
      const stream = fs.createReadStream(form.file_path);
      stream.pipe(res);
    } else {
      res.send(form.template_content);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/approval-types/:id/prescribed-form', requireAuth, async (req, res, next) => {
  try {
    const approvalType = await approvalService.getApprovalType(req.params.id);
    const form = getPrescribedFormForApproval(approvalType.name);
    res.json(form);
  } catch (err) {
    next(err);
  }
});

router.post('/approval-types/:id/check-applicability', requireAuth, async (req, res, next) => {
  try {
    const { project_id } = req.body;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }
    const result = await approvalService.checkApprovalApplicability(req.params.id, project_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/approval-types/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await approvalService.getApprovalType(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
