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

export async function notifyUsers(
  userIds: string[],
  title: string,
  message: string,
  type: string
) {
  if (userIds.length === 0) return [];
  const promises = userIds.map((uid) => createNotification(uid, title, message, type));
  return Promise.all(promises);
}

export async function notifyRoleUsers(
  role: string,
  title: string,
  message: string,
  type: string,
  departmentId?: string
) {
  const whereClause: any = { role };
  if (departmentId) whereClause.department_id = departmentId;
  const users = await prisma.user.findMany({ where: whereClause });
  const ids = users.map((u) => u.id);
  return notifyUsers(ids, title, message, type);
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

export async function notifyApplicationSubmitted(
  applicationNumber: string,
  approvalName: string,
  departmentId?: string | null,
  orgId?: string | null
) {
  // Notify Applicant
  if (orgId) {
    const orgUsers = await prisma.user.findMany({ where: { org_id: orgId } });
    for (const u of orgUsers) {
      await createNotification(
        u.id,
        `Application Submitted — ${approvalName}`,
        `Application ${applicationNumber} for ${approvalName} has been submitted for scrutiny under MAITRI single-window framework.`,
        'info'
      );
    }
  }

  // Notify Competent Authority Officers of the department
  if (departmentId) {
    await notifyRoleUsers(
      'OFFICER',
      `New Application for Scrutiny — ${approvalName}`,
      `Application ${applicationNumber} for ${approvalName} has been submitted and is awaiting scrutiny in your work queue.`,
      'info',
      departmentId
    );
  }
}

export async function notifyDecisionRecorded(
  applicationNumber: string,
  approvalName: string,
  decision: 'APPROVED' | 'REJECTED',
  departmentName: string,
  orgId?: string | null,
  reason?: string
) {
  const isApproved = decision === 'APPROVED';
  const title = isApproved
    ? `Statutory Permission Granted — ${approvalName}`
    : `Statutory Decision Recorded — ${approvalName}`;
  const msg = isApproved
    ? `The Competent Authority (${departmentName}) has granted permission for application ${applicationNumber}. Clearance reference is now available.`
    : `The Competent Authority (${departmentName}) has rejected application ${applicationNumber}. Statutory grounds: "${reason || 'Non-compliance with regulatory criteria'}".`;
  const type = isApproved ? 'success' : 'error';

  // Notify Applicant
  if (orgId) {
    const orgUsers = await prisma.user.findMany({ where: { org_id: orgId } });
    for (const u of orgUsers) {
      await createNotification(u.id, title, msg, type);
    }
  }

  // Notify MAITRI Nodal Officers
  await notifyRoleUsers(
    'NODAL',
    `Statutory Decision Notification — ${applicationNumber}`,
    `${departmentName} recorded decision (${decision}) on application ${applicationNumber} (${approvalName}).`,
    isApproved ? 'success' : 'warning'
  );
}

export async function notifyEmpoweredCommitteeEscalation(
  applicationNumber: string,
  approvalName: string,
  departmentId?: string | null,
  orgId?: string | null,
  actorName?: string,
  reason?: string
) {
  const title = `Transferred to Empowered Committee — ${approvalName}`;
  const nodalMsg = `Application ${applicationNumber} (${approvalName}) has been escalated to the Empowered Committee by ${actorName || 'Nodal Agency'}. Reason: "${reason || 'Statutory specified time limit exceeded'}".`;
  const deptMsg = `Application ${applicationNumber} pending with your department has been transferred / escalated to the Empowered Committee under the Maharashtra Industry, Trade and Investment Facilitation Act, 2023.`;
  const applicantMsg = `Your application ${applicationNumber} has been escalated to the Empowered Committee for statutory time limit resolution under MAITRI Rules.`;

  // Notify Nodal Officers
  await notifyRoleUsers('NODAL', title, nodalMsg, 'alert');

  // Notify Department Officers
  if (departmentId) {
    await notifyRoleUsers('OFFICER', title, deptMsg, 'alert', departmentId);
  }

  // Notify Applicant
  if (orgId) {
    const orgUsers = await prisma.user.findMany({ where: { org_id: orgId } });
    for (const u of orgUsers) {
      await createNotification(u.id, title, applicantMsg, 'alert');
    }
  }
}

export async function notifySLAAtRisk(
  userId: string,
  applicationNumber: string,
  approvalName: string,
  dueDateStr: string
) {
  return createNotification(
    userId,
    `Specified Time Limit At Risk — ${approvalName}`,
    `Application ${applicationNumber} configured service timeline is at risk (< 25% remaining). Due date: ${dueDateStr}. Scrutiny expedited.`,
    'warning'
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
    `Statutory Permission Granted — ${approvalName}`,
    `Application ${applicationNumber} for ${approvalName} has been approved by the Competent Authority.`,
    'success'
  );
}
