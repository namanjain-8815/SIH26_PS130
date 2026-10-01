import { prisma } from '../lib/prisma';

export async function recordAudit(data: {
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data?: unknown;
  after_data?: unknown;
  metadata?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      actor_id: data.actor_id,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      before_data: data.before_data as never,
      after_data: data.after_data as never,
      metadata: data.metadata as never,
    },
  });
}

export async function listAuditLog(filters: {
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  action?: string;
  from?: Date;
  to?: Date;
  take?: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters.entity_type ? { entity_type: filters.entity_type } : {}),
      ...(filters.entity_id ? { entity_id: filters.entity_id } : {}),
      ...(filters.actor_id ? { actor_id: filters.actor_id } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            timestamp: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { timestamp: 'desc' },
    take: filters.take ?? 200,
  });
}
