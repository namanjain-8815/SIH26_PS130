import { prisma } from '../lib/prisma';
import { SupabaseStorageAdapter } from '../adapters/SupabaseStorageAdapter';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { extractFieldsFromPdf, DocumentExtractionResult } from './pdfExtractionService';
import { recordAudit } from './auditService';

export const storage = new SupabaseStorageAdapter();

export async function listDocuments(projectId: string) {
  const docs = await prisma.document.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'desc' },
  });

  // Enrich each document with reuse count (how many applications reference it)
  const reuseCountsRaw = await prisma.applicationDocument.groupBy({
    by: ['document_id'],
    _count: { document_id: true },
    where: { document_id: { in: docs.map((d) => d.id) } },
  });

  const reuseMap = new Map(reuseCountsRaw.map((r) => [r.document_id, r._count.document_id]));

  // Retrieve cached extractions from ProjectAttribute
  const extractionAttrs = await prisma.projectAttribute.findMany({
    where: { project_id: projectId },
  });
  const extractionMap = new Map<string, DocumentExtractionResult>();
  for (const a of extractionAttrs) {
    if (a.key.startsWith('doc_extraction:')) {
      const docId = a.key.replace('doc_extraction:', '');
      try {
        extractionMap.set(docId, JSON.parse(a.value));
      } catch {}
    }
  }

  // Check physical file availability in storage
  const availabilityEntries = await Promise.all(
    docs.map(async (doc) => {
      const isAvailable = doc.file_url ? await storage.exists(doc.file_url) : false;
      return [doc.id, isAvailable] as const;
    })
  );
  const availabilityMap = new Map(availabilityEntries);

  return docs.map((doc) => {
    const ext = extractionMap.get(doc.id);
    return {
      ...doc,
      is_file_available: availabilityMap.get(doc.id) ?? false,
      reuse_count: reuseMap.get(doc.id) ?? 0,
      extracted_field_count: ext ? ext.field_count : 0,
      extraction_status: ext
        ? ext.status
        : doc.verification_status === 'VERIFIED'
        ? 'EXTRACTED'
        : 'PENDING',
      is_readable: ext ? ext.is_readable : true,
      is_expiring_soon:
        doc.expiry_date != null &&
        doc.expiry_date > new Date() &&
        doc.expiry_date < new Date(Date.now() + 30 * 86_400_000),
      is_expired: doc.expiry_date != null && doc.expiry_date <= new Date(),
    };
  });
}

export async function getDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      application_documents: {
        include: {
          application: {
            include: { project_approval: { include: { approval_type: true } } },
          },
        },
      },
    },
  });
  if (!doc) throw new NotFoundError('Document not found');

  const appDocs = doc.application_documents || [];
  const reuseCount = appDocs.length;

  const isFileAvailable = doc.file_url ? await storage.exists(doc.file_url) : false;

  // Determine delete safety
  // If attached to any application that is past draft (e.g. SUBMITTED, APPROVED, UNDER_REVIEW), deletion is blocked
  const submittedApp = appDocs.find(
    (ad: any) => ad.application && !['NOT_STARTED', 'DRAFT'].includes(ad.application.status)
  );
  const canDelete = !submittedApp;
  const deleteProtectionReason = submittedApp
    ? `Document is attached to submitted application ${submittedApp.application.application_number} (${submittedApp.application.status}). Statutory audit trail requires retaining historical exhibits.`
    : undefined;

  let extraction: DocumentExtractionResult | null = null;
  try {
    extraction = await getDocumentExtraction(id);
  } catch {}

  return {
    ...doc,
    is_file_available: isFileAvailable,
    reuse_count: reuseCount,
    can_delete: canDelete,
    delete_protection_reason: deleteProtectionReason,
    reused_by: appDocs.map((ad: any) => ({
      application_id: ad.application_id,
      application_number: ad.application?.application_number,
      approval_name: ad.application?.project_approval?.approval_type?.name,
      application_status: ad.application?.status,
      validation_status: ad.validation_status,
    })),
    extraction,
  };
}

export async function uploadDocument(
  orgId: string | undefined,
  projectId: string,
  documentType: string,
  originalName: string,
  buffer: Buffer,
  expiryDate?: Date,
  issuedDate?: Date,
  applicationId?: string
) {
  let resolvedOrgId = orgId;
  if (!resolvedOrgId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    resolvedOrgId = proj?.org_id;
  }
  if (!resolvedOrgId) throw new NotFoundError('Organization not found for project');

  const stored = await storage.save(originalName, buffer);
  const doc = await prisma.document.create({
    data: {
      org_id: resolvedOrgId,
      project_id: projectId,
      document_type: documentType,
      file_name: stored.file_name,
      file_url: stored.url,
      issued_date: issuedDate,
      expiry_date: expiryDate,
      verification_status: 'PENDING',
    },
  });

  // Extract structured fields from the actual uploaded PDF buffer
  let extractionResult: DocumentExtractionResult | null = null;
  try {
    extractionResult = await extractFieldsFromPdf(buffer, {
      documentId: doc.id,
      fileName: originalName,
      documentType,
    });
    await prisma.projectAttribute.upsert({
      where: { project_id_key: { project_id: projectId, key: `doc_extraction:${doc.id}` } },
      update: { value: JSON.stringify(extractionResult) },
      create: { project_id: projectId, key: `doc_extraction:${doc.id}`, value: JSON.stringify(extractionResult) },
    });
  } catch (err) {
    console.error('PDF field extraction failed on upload:', err);
  }

  if (applicationId) {
    await prisma.applicationDocument.upsert({
      where: { application_id_document_id: { application_id: applicationId, document_id: doc.id } },
      update: {},
      create: { application_id: applicationId, document_id: doc.id, validation_status: 'PENDING' },
    });
  }

  return {
    ...doc,
    extraction: extractionResult,
  };
}

export async function replaceDocument(
  id: string,
  originalName: string,
  buffer: Buffer,
  expiryDate?: Date
) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Document not found');

  const stored = await storage.save(originalName, buffer);
  const updated = await prisma.document.update({
    where: { id },
    data: {
      file_name: stored.file_name,
      file_url: stored.url,
      version: (existing.version || 1) + 1,
      verification_status: 'PENDING',
      expiry_date: expiryDate ?? existing.expiry_date,
    },
  });

  // Re-run PDF field extraction on the new buffer
  let extractionResult: DocumentExtractionResult | null = null;
  try {
    extractionResult = await extractFieldsFromPdf(buffer, {
      documentId: id,
      fileName: originalName,
      documentType: existing.document_type,
    });
    await prisma.projectAttribute.upsert({
      where: { project_id_key: { project_id: existing.project_id, key: `doc_extraction:${id}` } },
      update: { value: JSON.stringify(extractionResult) },
      create: { project_id: existing.project_id, key: `doc_extraction:${id}`, value: JSON.stringify(extractionResult) },
    });
  } catch (err) {
    console.error('PDF field extraction failed on replace:', err);
  }

  return {
    ...updated,
    extraction: extractionResult,
  };
}

export async function reExtractDocument(id: string): Promise<DocumentExtractionResult> {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError('Document not found');

  const buffer = await storage.read(doc.file_url);
  if (!buffer) {
    throw new NotFoundError('Document physical file is unavailable in storage. Please upload or replace the document.');
  }

  const extractionResult = await extractFieldsFromPdf(buffer, {
    documentId: id,
    fileName: doc.file_name,
    documentType: doc.document_type,
  });

  await prisma.projectAttribute.upsert({
    where: { project_id_key: { project_id: doc.project_id, key: `doc_extraction:${id}` } },
    update: { value: JSON.stringify(extractionResult) },
    create: { project_id: doc.project_id, key: `doc_extraction:${id}`, value: JSON.stringify(extractionResult) },
  });

  return extractionResult;
}

export async function getDocumentExtraction(id: string): Promise<DocumentExtractionResult> {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError('Document not found');

  const attr = await prisma.projectAttribute.findUnique({
    where: { project_id_key: { project_id: doc.project_id, key: `doc_extraction:${id}` } },
  });

  if (attr) {
    try {
      return JSON.parse(attr.value);
    } catch {}
  }

  // Attempt on-demand extraction from disk
  const buffer = await storage.read(doc.file_url);
  if (buffer) {
    const extractionResult = await extractFieldsFromPdf(buffer, {
      documentId: id,
      fileName: doc.file_name,
      documentType: doc.document_type,
    });
    await prisma.projectAttribute.upsert({
      where: { project_id_key: { project_id: doc.project_id, key: `doc_extraction:${id}` } },
      update: { value: JSON.stringify(extractionResult) },
      create: { project_id: doc.project_id, key: `doc_extraction:${id}`, value: JSON.stringify(extractionResult) },
    }).catch(() => {});
    return extractionResult;
  }

  return {
    document_id: id,
    document_type: doc.document_type,
    file_name: doc.file_name,
    is_readable: false,
    page_count: 0,
    status: 'MANUAL_VERIFICATION_REQUIRED',
    extracted_at: new Date().toISOString(),
    field_count: 0,
    fields: {},
  };
}

/**
 * Safely deletes a document conforming to regulatory history rules.
 */
export async function deleteDocument(id: string, actorId?: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError('Document not found');

  const appDocs = await prisma.applicationDocument.findMany({
    where: { document_id: id },
    include: { application: true },
  });

  const submittedApp = appDocs.find(
    (ad: any) => ad.application && !['NOT_STARTED', 'DRAFT'].includes(ad.application.status)
  );

  if (submittedApp) {
    throw new BadRequestError(
      `Cannot delete document: It is attached to submitted application ${submittedApp.application.application_number} (${submittedApp.application.status}). Historical exhibits cannot be destroyed.`
    );
  }

  // Safe to delete: remove associations in draft applications
  if (appDocs.length > 0) {
    await prisma.applicationDocument.deleteMany({
      where: { document_id: id },
    });
  }

  // Remove extraction attributes
  await prisma.projectAttribute.deleteMany({
    where: { project_id: doc.project_id, key: `doc_extraction:${id}` },
  });

  // Remove database record
  await prisma.document.delete({ where: { id } });

  // Delete physical storage file
  if (doc.file_url) {
    await storage.delete(doc.file_url).catch(() => {});
  }

  // Audit event
  await recordAudit({
    actor_id: actorId,
    action: 'DOCUMENT_DELETED',
    entity_type: 'Document',
    entity_id: id,
    before_data: { file_name: doc.file_name, document_type: doc.document_type, project_id: doc.project_id },
    after_data: null,
    metadata: { reason: 'User initiated safe deletion of unsubmitted vault document' },
  });

  return { success: true, message: `Document "${doc.file_name}" deleted successfully.` };
}

export async function updateDocument(
  id: string,
  data: Partial<{
    verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
    expiry_date: Date;
    issued_date: Date;
  }>
) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError('Document not found');

  const updated = await prisma.document.update({ where: { id }, data: data as never });

  // If verification status changed, update application document validation status
  if (data.verification_status) {
    const valStatus =
      data.verification_status === 'VERIFIED'
        ? 'VALID'
        : data.verification_status === 'REJECTED' || data.verification_status === 'EXPIRED'
        ? 'INVALID'
        : 'PENDING';

    const appDocs = await prisma.applicationDocument.findMany({ where: { document_id: id } });
    for (const ad of appDocs) {
      await prisma.applicationDocument.update({
        where: { id: ad.id },
        data: { validation_status: valStatus },
      });
    }
  }

  return updated;
}

export async function getMissingDocuments(projectId: string) {
  const projectApprovals = await prisma.projectApproval.findMany({
    where: { project_id: projectId },
    include: {
      approval_type: { include: { document_requirements: true } },
    },
  });

  const existingDocs = await prisma.document.findMany({ where: { project_id: projectId } });
  const existingTypes = new Set(existingDocs.map((d) => d.document_type));

  const missing: Array<{ document_type: string; mandatory: boolean; for_approvals: string[] }> = [];
  const seen = new Map<string, string[]>();

  for (const pa of projectApprovals) {
    for (const req of pa.approval_type.document_requirements) {
      if (!existingTypes.has(req.document_type)) {
        if (!seen.has(req.document_type)) {
          seen.set(req.document_type, []);
        }
        seen.get(req.document_type)!.push(pa.approval_type.name);
      }
    }
  }

  for (const [doc_type, forApprovals] of seen) {
    const req = projectApprovals
      .flatMap((pa) => pa.approval_type.document_requirements)
      .find((dr) => dr.document_type === doc_type);
    missing.push({
      document_type: doc_type,
      mandatory: req?.mandatory ?? true,
      for_approvals: forApprovals,
    });
  }

  return missing;
}
