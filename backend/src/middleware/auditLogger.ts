import { Request } from 'express';
import * as auditService from '../services/auditService';

/**
 * Call from inside a route/service after a mutating action to record an
 * AuditLog row (plan §39). Kept as a thin helper rather than global
 * middleware so each call site can supply its own before/after snapshots.
 */
export async function logAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  before?: unknown,
  after?: unknown
) {
  await auditService.recordAudit({
    actor_id: req.user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: before,
    after_data: after,
  });
}
