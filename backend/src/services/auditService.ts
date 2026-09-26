import { prisma } from '../lib/prisma';

export async function recordAudit(data: {
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data?: unknown;
  after_data?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      actor_id: data.actor_id,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      before_data: data.before_data as never,
      after_data: data.after_data as never,
    },
  });
}

export async function listAuditLog(filters: { entity_type?: string; actor_id?: string }) {
  return prisma.auditLog.findMany({
    where: filters,
    orderBy: { timestamp: 'desc' },
    take: 200,
  });
}
