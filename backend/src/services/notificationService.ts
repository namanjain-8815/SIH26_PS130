import { prisma } from '../lib/prisma';

/**
 * Centralized notification creation — all notification generation must
 * go through this service, not be scattered across route files.
 * (IMPLEMENTATION_PLAN.md §34)
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string
) {
  return prisma.notification.create({ data: { user_id: userId, title, message, type } });
}

export async function listUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { user_id: userId, read: false } });
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { user_id: userId, read: false }, data: { read: true } });
}

// ─── Typed notification factories ───────────────────────────────────────────

export async function notifyApplicationStatusChange(
  userId: string,
  applicationNumber: string,
  approvalName: string,
  newStatus: string
) {
  return createNotification(
    userId,
    `Application Status Updated — ${approvalName}`,
    `Application ${applicationNumber} status changed to ${newStatus.replace('_', ' ')}.`,
    'info'
  );
}

export async function notifySLAAtRisk(
  userId: string,
  applicationNumber: string,
  approvalName: string,
  dueDateStr: string
) {
  return createNotification(
    userId,
    `Configured SLA At Risk — ${approvalName}`,
    `Application ${applicationNumber} configured SLA is at risk. Due: ${dueDateStr}. This is a configured service timeline, not a legal commitment.`,
    'alert'
  );
}

export async function notifyDocumentExpiringSoon(
  userId: string,
  documentType: string,
  expiryDateStr: string
) {
  return createNotification(
    userId,
    `Document Expiring Soon`,
    `Your uploaded document "${documentType}" expires on ${expiryDateStr}. Please renew and re-upload to avoid application delays.`,
    'warning'
  );
}

export async function notifyApprovalCompleted(
  userId: string,
  approvalName: string,
  applicationNumber: string
) {
  return createNotification(
    userId,
    `Approval Obtained — ${approvalName}`,
    `Application ${applicationNumber} for ${approvalName} has been approved.`,
    'success'
  );
}
