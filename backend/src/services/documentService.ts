import { prisma } from '../lib/prisma';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { NotFoundError } from '../lib/errors';

const storage = new LocalStorageAdapter();

export async function listDocuments(projectId: string) {
  return prisma.document.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
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
  }>
) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError('Document not found');
  return prisma.document.update({ where: { id }, data: data as never });
}
