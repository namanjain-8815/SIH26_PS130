import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as documentService from '../services/documentService';
import { preValidateDocument } from '../services/documentValidatorService';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

const router = Router();

router.get('/projects/:id/documents', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.listDocuments(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/documents/pre-validate', requireAuth, async (req, res, next) => {
  try {
    const { document_type, file_name, file_base64, size_bytes, project_id, expiry_date } = req.body as {
      document_type: string;
      file_name: string;
      file_base64?: string;
      size_bytes?: number;
      project_id?: string;
      expiry_date?: string;
    };
    const buffer = file_base64 ? Buffer.from(file_base64, 'base64') : undefined;
    const result = await preValidateDocument({
      document_type,
      file_name,
      buffer,
      size_bytes,
      project_id,
      expiry_date,
    });
    res.json(result);
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

    // Run statutory pre-validation
    const validation = await preValidateDocument({
      document_type,
      file_name,
      buffer,
      project_id: req.params.id,
      expiry_date,
    });
    if (!validation.accepted) {
      return res.status(400).json({
        error: 'Document not accepted',
        reasons: validation.errors,
        validation,
      });
    }

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
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const validation = await preValidateDocument({
      document_type: existing.document_type,
      file_name,
      buffer,
      project_id: existing.project_id,
      expiry_date,
    });
    if (!validation.accepted) {
      return res.status(400).json({
        error: 'Document not accepted',
        reasons: validation.errors,
        validation,
      });
    }

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

router.delete('/documents/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.deleteDocument(req.params.id, req.user?.id));
  } catch (err) {
    next(err);
  }
});

router.post('/documents/:id/re-extract', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.reExtractDocument(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id/extracted-fields', requireAuth, async (req, res, next) => {
  try {
    res.json(await documentService.getDocumentExtraction(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/document-detail-centre', requireAuth, async (req, res, next) => {
  try {
    const { getDocumentDetailCentre } = await import('../services/documentDetailCentreService');
    res.json(await getDocumentDetailCentre(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id/availability', async (req, res, next) => {
  try {
    const doc = await documentService.getDocument(req.params.id);
    if (!doc) throw new NotFoundError('Document record not found');
    const { storage } = await import('../services/documentService');
    const isAvailable = doc.file_url ? await storage.exists(doc.file_url) : false;
    res.json({
      id: doc.id,
      is_available: isAvailable,
      file_name: doc.file_name,
      document_type: doc.document_type,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id/file', async (req, res, next) => {
  try {
    const doc = await documentService.getDocument(req.params.id);
    if (!doc) throw new NotFoundError('Document record not found');

    const { storage } = await import('../services/documentService');
    const buffer = doc.file_url ? await storage.read(doc.file_url) : null;

    if (!buffer) {
      return res.status(404).json({
        error: 'FILE_UNAVAILABLE',
        message: 'Physical document file is unavailable in storage. Please upload or replace the document.',
        document_id: doc.id,
        file_name: doc.file_name,
        can_reupload: true,
      });
    }

    const fileName = doc.file_name || 'document.pdf';
    const lowerName = fileName.toLowerCase();
    const mimeType = lowerName.endsWith('.pdf')
      ? 'application/pdf'
      : lowerName.endsWith('.png')
      ? 'image/png'
      : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'application/pdf';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.patch('/projects/:id/document-detail-centre/:fieldKey', requireAuth, async (req, res, next) => {
  try {
    const { updateMasterField } = await import('../services/documentDetailCentreService');
    const rawVal = req.body.value !== undefined ? req.body.value : req.body.master_value;
    const note = req.body.note || (req.body.confirmed ? 'Confirmed via Document Detail Centre' : undefined);
    res.json(await updateMasterField(req.params.id, req.params.fieldKey, rawVal, req.user?.id, note));
  } catch (err) {
    next(err);
  }
});

export default router;

