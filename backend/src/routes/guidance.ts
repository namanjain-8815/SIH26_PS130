import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as guidanceService from '../services/guidanceAssistantService';

const router = Router();

// P1.12 — Contextual Help & Guidance Assistant endpoint
router.get('/guidance/contextual', requireAuth, async (req, res, next) => {
  try {
    const payload = await guidanceService.getContextualGuidance({
      page: req.query.page as string | undefined,
      project_id: req.query.project_id as string | undefined,
      application_id: req.query.application_id as string | undefined,
      approval_type_id: req.query.approval_type_id as string | undefined,
      query_text: req.query.query_text as string | undefined,
    });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
