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
    const { org_id, document_type, file_name, file_base64, expiry_date, issued_date, application_id } = req.body as {
      org_id?: string;
      document_type: string;
      file_name: string;
      file_base64: string;
      expiry_date?: string;
      issued_date?: string;
      application_id?: string;
    };
    const buffer = Buffer.from(file_base64, 'base64');
    res.status(201).json(
      await documentService.uploadDocument(
        org_id,
        req.params.id,
        document_type,
        file_name,
        buffer,
        expiry_date ? new Date(expiry_date) : undefined,
        issued_date ? new Date(issued_date) : undefined,
        application_id
      )
    );
  } catch (err) {
    next(err);
  }
});

router.post('/documents/:id/replace', requireAuth, async (req, res, next) => {
  try {
    const { file_name, file_base64, expiry_date } = req.body as {
      file_name: string;
      file_base64: string;
      expiry_date?: string;
    };
    const buffer = Buffer.from(file_base64, 'base64');
    res.json(
      await documentService.replaceDocument(
        req.params.id,
        file_name,
        buffer,
        expiry_date ? new Date(expiry_date) : undefined
      )
    );
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

router.get('/projects/:id/documents/missing', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.getMissingDocuments(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.getDocument(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
