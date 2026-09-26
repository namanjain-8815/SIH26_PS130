import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as documentService from '../services/documentService';

const router = Router();

router.get('/projects/:id/documents', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.listDocuments(req.params.id));
  } catch (err) {
    next(err);
  }
});

// MVP body shape: { org_id, document_type, file_name, file_base64 }.
// Swap for multipart/form-data + multer if a real file upload UI needs it.
router.post('/projects/:id/documents', requireAuth, async (req, res, next) => {
  try {
    const { org_id, document_type, file_name, file_base64 } = req.body as {
      org_id: string;
      document_type: string;
      file_name: string;
      file_base64: string;
    };
    const buffer = Buffer.from(file_base64, 'base64');
    res
      .status(201)
      .json(await documentService.uploadDocument(org_id, req.params.id, document_type, file_name, buffer));
  } catch (err) {
    next(err);
  }
});

router.patch('/documents/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.updateDocument(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

export default router;
