import { prisma } from '../lib/prisma';

export async function createNotification(userId: string, title: string, message: string, type: string) {
  return prisma.notification.create({ data: { user_id: userId, title, message, type } });
}

export async function listUserNotifications(userId: string) {
  return prisma.notification.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' } });
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

// TODO (plan §34): call createNotification() from the relevant service
// right after each triggering event — new query, SLA approaching/breached,
// document expiry, application status change, inspection scheduled/changed,
// approval completed, renewal approaching, new incentive match.
