import { prisma } from '../lib/prisma';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { NotFoundError } from '../lib/errors';

const storage = new LocalStorageAdapter();

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

  return docs.map((doc) => ({
    ...doc,
    reuse_count: reuseMap.get(doc.id) ?? 0,
    is_expiring_soon:
      doc.expiry_date != null &&
      doc.expiry_date > new Date() &&
      doc.expiry_date < new Date(Date.now() + 30 * 86_400_000),
    is_expired: doc.expiry_date != null && doc.expiry_date <= new Date(),
  }));
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

  return {
    ...doc,
    reuse_count: reuseCount,
    reused_by: appDocs.map((ad: any) => ({
      application_id: ad.application_id,
      application_number: ad.application?.application_number,
      approval_name: ad.application?.project_approval?.approval_type?.name,
      validation_status: ad.validation_status,
    })),
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

  if (applicationId) {
    await prisma.applicationDocument.upsert({
      where: { application_id_document_id: { application_id: applicationId, document_id: doc.id } },
      update: {},
      create: { application_id: applicationId, document_id: doc.id, validation_status: 'PENDING' },
    });
  }

  return doc;
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
  return prisma.document.update({
    where: { id },
    data: {
      file_name: stored.file_name,
      file_url: stored.url,
      version: (existing.version || 1) + 1,
      verification_status: 'PENDING',
      expiry_date: expiryDate ?? existing.expiry_date,
    },
  });
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

/**
 * Returns all document types that are required for a project's approvals
 * but haven't yet been uploaded. Used to show "missing documents" in the vault.
 */
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
