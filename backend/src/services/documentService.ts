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

  const reuseCount = doc.application_documents.length;

  return {
    ...doc,
    reuse_count: reuseCount,
    reused_by: doc.application_documents.map((ad) => ({
      application_id: ad.application_id,
      application_number: ad.application.application_number,
      approval_name: ad.application.project_approval.approval_type.name,
      validation_status: ad.validation_status,
    })),
  };
}

export async function uploadDocument(
  orgId: string,
  projectId: string,
  documentType: string,
  originalName: string,
  buffer: Buffer
) {
  const stored = await storage.save(originalName, buffer);
  return prisma.document.create({
    data: {
      org_id: orgId,
      project_id: projectId,
      document_type: documentType,
      file_name: stored.file_name,
      file_url: stored.url,
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
  return prisma.document.update({ where: { id }, data: data as never });
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
