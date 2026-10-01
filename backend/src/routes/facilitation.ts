import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as facilitationService from '../services/facilitationService';

export const router = Router();

router.use(requireAuth);

function sanitizeParam(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const t = val.trim();
  return !t || t === 'undefined' || t === 'null' || t === 'ALL' ? undefined : t;
}

// GET /api/facilitation — list requests for current user or all requests if government officer
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: sanitizeParam(req.query.status),
      category: sanitizeParam(req.query.category),
      priority: sanitizeParam(req.query.priority),
      project_id: sanitizeParam(req.query.project_id),
    };

    const requests = await facilitationService.listFacilitationRequests(req.user!, filters);
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// POST /api/facilitation — submit a new investor assistance / facilitation request
router.post('/', async (req, res, next) => {
  try {
    const { category, subject, description, project_id, application_id, priority } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Category, subject, and description are required' });
    }

    const request = await facilitationService.createFacilitationRequest(req.user!.id, {
      category,
      subject,
      description,
      project_id,
      application_id,
      priority,
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/facilitation/:id — get request details, notes, and timeline
router.get('/:id', async (req, res, next) => {
  try {
    const request = await facilitationService.getFacilitationRequestById(req.params.id, req.user!);
    res.json(request);
  } catch (err) {
    next(err);
  }
});

// POST /api/facilitation/:id/claim — claim/assign request to officer
router.post(
  '/:id/claim',
  requireRole('NODAL', 'OFFICER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { desk } = req.body;
      const updated = await facilitationService.claimFacilitationRequest(
        req.params.id,
        req.user!,
        desk
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/facilitation/:id/notes — add coordination note or reply
router.post('/:id/notes', async (req, res, next) => {
  try {
    const { note, is_internal } = req.body;
    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const updated = await facilitationService.addCoordinationNote(
      req.params.id,
      req.user!,
      note.trim(),
      Boolean(is_internal)
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/facilitation/:id/resolve — mark request as resolved
router.post(
  '/:id/resolve',
  requireRole('NODAL', 'OFFICER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { resolution_notes } = req.body;
      if (!resolution_notes || typeof resolution_notes !== 'string' || !resolution_notes.trim()) {
        return res.status(400).json({ error: 'Resolution notes are required to resolve request' });
      }

      const updated = await facilitationService.resolveFacilitationRequest(
        req.params.id,
        req.user!,
        resolution_notes.trim()
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/facilitation/:id/close — mark request as closed
router.post('/:id/close', async (req, res, next) => {
  try {
    const updated = await facilitationService.closeFacilitationRequest(req.params.id, req.user!);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
