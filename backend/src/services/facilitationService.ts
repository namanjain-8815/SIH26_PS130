import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { createNotification, notifyRoleUsers } from './notificationService';
import { recordCoordinationNote } from './applicationService';
import type {
  FacilitationRequest,
  FacilitationCategory,
  FacilitationPriority,
  FacilitationStatus,
  FacilitationNote,
  FacilitationTimelineItem,
  User,
  Priority,
} from '../types/database';

export interface CreateFacilitationInput {
  category: FacilitationCategory;
  subject: string;
  description: string;
  project_id?: string;
  application_id?: string;
  priority?: Priority;
}

export interface ListFacilitationFilters {
  status?: string;
  category?: string;
  priority?: string;
  project_id?: string;
}

/**
 * Reconstructs the latest FacilitationRequest state from AuditLog records.
 */
function reconstructRequest(auditLogs: any[]): FacilitationRequest | null {
  if (!auditLogs || auditLogs.length === 0) return null;

  // Find the creation log or the most recent log containing full request snapshot
  // Sort logs chronologically ascending to playback updates
  const sorted = [...auditLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let current: FacilitationRequest | null = null;

  for (const log of sorted) {
    const data = (log.details || log.metadata) as Partial<FacilitationRequest>;
    if (!data) continue;

    if (!current) {
      current = {
        id: log.entity_id,
        reference: data.reference || `FAC-2026-${log.entity_id.slice(0, 4).toUpperCase()}`,
        applicant_id: data.applicant_id || log.actor_id || '',
        applicant_name: data.applicant_name || 'Applicant',
        applicant_email: data.applicant_email || '',
        category: (data.category as FacilitationCategory) || 'General Facilitation',
        subject: data.subject || 'Facilitation Request',
        description: data.description || '',
        project_id: data.project_id || null,
        project_name: data.project_name || null,
        application_id: data.application_id || null,
        application_number: data.application_number || null,
        priority: (data.priority as Priority) || 'MEDIUM',
        status: (data.status as FacilitationStatus) || 'OPEN',
        assigned_to: data.assigned_to || null,
        assigned_to_name: data.assigned_to_name || null,
        responsible_desk: data.responsible_desk || 'MAITRI Single Window Nodal Cell',
        resolution_notes: data.resolution_notes || null,
        notes: Array.isArray(data.notes) ? data.notes : [],
        timeline: Array.isArray(data.timeline) ? data.timeline : [],
        created_at: data.created_at || new Date(log.timestamp).toISOString(),
        updated_at: data.updated_at || new Date(log.timestamp).toISOString(),
        resolved_at: data.resolved_at || null,
      };
    } else {
      // Apply updates from subsequent actions
      if (data.status) current.status = data.status as FacilitationStatus;
      if (data.assigned_to !== undefined) current.assigned_to = data.assigned_to;
      if (data.assigned_to_name !== undefined) current.assigned_to_name = data.assigned_to_name;
      if (data.responsible_desk) current.responsible_desk = data.responsible_desk;
      if (data.resolution_notes !== undefined) current.resolution_notes = data.resolution_notes;
      if (data.resolved_at !== undefined) current.resolved_at = data.resolved_at;
      if (Array.isArray(data.notes)) current.notes = data.notes;
      if (Array.isArray(data.timeline)) current.timeline = data.timeline;
      current.updated_at = data.updated_at || new Date(log.timestamp).toISOString();
    }
  }

  return current;
}

export async function createFacilitationRequest(
  userId: string,
  input: CreateFacilitationInput
): Promise<FacilitationRequest> {
  const id = `fac-${crypto.randomUUID().slice(0, 8)}`;
  const reference = `FAC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const applicant = await prisma.user.findUnique({ where: { id: userId } });

  let projectName: string | null = null;
  if (input.project_id) {
    const proj = await prisma.project.findUnique({ where: { id: input.project_id } });
    if (proj) projectName = proj.name;
  }

  let appNumber: string | null = null;
  if (input.application_id) {
    const app = await prisma.application.findUnique({ where: { id: input.application_id } });
    if (app) appNumber = app.application_number;
  }

  const now = new Date().toISOString();
  const request: FacilitationRequest = {
    id,
    reference,
    applicant_id: userId,
    applicant_name: applicant?.name || 'Applicant',
    applicant_email: applicant?.email || '',
    category: input.category,
    subject: input.subject,
    description: input.description,
    project_id: input.project_id || null,
    project_name: projectName,
    application_id: input.application_id || null,
    application_number: appNumber,
    priority: input.priority || 'MEDIUM',
    status: 'OPEN',
    assigned_to: null,
    assigned_to_name: null,
    responsible_desk: 'MAITRI Single Window Nodal Cell',
    resolution_notes: null,
    notes: [],
    timeline: [
      {
        event: 'REQUEST_SUBMITTED',
        timestamp: now,
        actor_name: applicant?.name || 'Applicant',
        notes: `Facilitation request registered under ${input.category}`,
      },
    ],
    created_at: now,
    updated_at: now,
    resolved_at: null,
  };

  // Persist into AuditLog as primary durable audit record
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      actor_id: userId,
      action: 'FACILITATION_REQUEST_CREATED',
      entity_type: 'FacilitationRequest',
      entity_id: id,
      metadata: request,
      timestamp: new Date(),
    },
  });

  // Notify MAITRI Nodal Officers
  await notifyRoleUsers(
    'NODAL',
    `New Facilitation Request: ${reference}`,
    `New investor assistance request registered for ${input.category} (${input.subject})`,
    'FACILITATION_REQUEST'
  );

  return request;
}

export async function listFacilitationRequests(
  user: { id: string; role: string; org_id?: string | null },
  filters?: ListFacilitationFilters
): Promise<FacilitationRequest[]> {
  // Query all FacilitationRequest logs
  const logs = await prisma.auditLog.findMany({
    where: { entity_type: 'FacilitationRequest' },
    orderBy: { timestamp: 'desc' },
  });

  // Group logs by entity_id
  const byEntity = new Map<string, any[]>();
  for (const log of logs) {
    if (!byEntity.has(log.entity_id)) {
      byEntity.set(log.entity_id, []);
    }
    byEntity.get(log.entity_id)!.push(log);
  }

  const requests: FacilitationRequest[] = [];
  for (const [_entityId, entityLogs] of byEntity.entries()) {
    const req = reconstructRequest(entityLogs);
    if (req) requests.push(req);
  }

  // Sort by created_at desc
  requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply authorization scoping:
  // Non-government users (ENTREPRENEUR, MANAGER) can only see their own requests
  const isGovernment = ['NODAL', 'OFFICER', 'ADMIN', 'INSPECTOR'].includes(user.role);
  let filtered = isGovernment
    ? requests
    : requests.filter((r) => r.applicant_id === user.id);

  // Apply optional filters
  if (filters?.status && filters.status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters?.category && filters.category !== 'ALL') {
    filtered = filtered.filter((r) => r.category === filters.category);
  }
  if (filters?.priority && filters.priority !== 'ALL') {
    filtered = filtered.filter((r) => r.priority === filters.priority);
  }
  if (filters?.project_id && filters.project_id !== 'ALL') {
    filtered = filtered.filter((r) => r.project_id === filters.project_id);
  }

  // Hide internal notes from applicants
  if (!isGovernment) {
    filtered = filtered.map((r) => ({
      ...r,
      notes: r.notes.filter((n) => !n.is_internal),
    }));
  }

  return filtered;
}

export async function getFacilitationRequestById(
  id: string,
  user: { id: string; role: string }
): Promise<FacilitationRequest> {
  const logs = await prisma.auditLog.findMany({
    where: { entity_type: 'FacilitationRequest', entity_id: id },
    orderBy: { timestamp: 'asc' },
  });

  if (!logs || logs.length === 0) {
    const err: any = new Error('Facilitation request not found');
    err.status = 404;
    throw err;
  }

  const request = reconstructRequest(logs);
  if (!request) {
    const err: any = new Error('Facilitation request not found');
    err.status = 404;
    throw err;
  }

  const isGovernment = ['NODAL', 'OFFICER', 'ADMIN', 'INSPECTOR'].includes(user.role);
  if (!isGovernment && request.applicant_id !== user.id) {
    const err: any = new Error('Forbidden: You do not have access to this facilitation request');
    err.status = 403;
    throw err;
  }

  // Filter internal notes for applicant
  if (!isGovernment) {
    request.notes = request.notes.filter((n) => !n.is_internal);
  }

  return request;
}

async function resolveUserName(user: { id: string; name?: string; role: string }): Promise<string> {
  if (user.name) return user.name;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.name) return dbUser.name;
  return user.role === 'NODAL' ? 'MAITRI Nodal Officer' : user.role === 'ENTREPRENEUR' ? 'Applicant' : 'Officer';
}

export async function claimFacilitationRequest(
  id: string,
  officerUser: { id: string; name?: string; role: string },
  desk?: string
): Promise<FacilitationRequest> {
  const current = await getFacilitationRequestById(id, officerUser as any);
  const officerName = await resolveUserName(officerUser);

  const now = new Date().toISOString();
  current.status = 'ASSIGNED';
  current.assigned_to = officerUser.id;
  current.assigned_to_name = officerName;
  if (desk) current.responsible_desk = desk;
  current.updated_at = now;

  current.timeline.push({
    event: 'REQUEST_CLAIMED',
    timestamp: now,
    actor_name: officerName,
    notes: `Assigned to ${officerName} (${current.responsible_desk})`,
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      actor_id: officerUser.id,
      action: 'FACILITATION_REQUEST_CLAIMED',
      entity_type: 'FacilitationRequest',
      entity_id: id,
      metadata: current,
      timestamp: new Date(),
    },
  });

  // Notify applicant
  await createNotification(
    current.applicant_id,
    `Facilitation Request Assigned: ${current.reference}`,
    `Your request has been claimed by MAITRI Nodal Officer ${officerName}.`,
    'FACILITATION_UPDATE'
  );

  return current;
}

export async function addCoordinationNote(
  id: string,
  user: { id: string; name?: string; role: string },
  noteText: string,
  isInternal: boolean = false
): Promise<FacilitationRequest> {
  const current = await getFacilitationRequestById(id, user as any);
  const authorName = await resolveUserName(user);

  const isGovernment = ['NODAL', 'OFFICER', 'ADMIN', 'INSPECTOR'].includes(user.role);
  if (!isGovernment) {
    // Applicants cannot write internal notes
    isInternal = false;
  }

  const now = new Date().toISOString();
  const newNote: FacilitationNote = {
    id: crypto.randomUUID(),
    author_id: user.id,
    author_name: authorName,
    author_role: user.role,
    note: noteText,
    created_at: now,
    is_internal: isInternal,
  };

  current.notes.push(newNote);
  current.updated_at = now;
  if (current.status === 'ASSIGNED') {
    current.status = 'IN_PROGRESS';
  }

  current.timeline.push({
    event: isInternal ? 'INTERNAL_NOTE_RECORDED' : 'COORDINATION_NOTE_RECORDED',
    timestamp: now,
    actor_name: authorName,
    notes: isInternal ? 'Internal coordination note recorded' : noteText.slice(0, 100),
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      actor_id: user.id,
      action: 'FACILITATION_COORDINATION_NOTE',
      entity_type: 'FacilitationRequest',
      entity_id: id,
      metadata: current,
      timestamp: new Date(),
    },
  });

  // If public note from government, notify applicant
  if (!isInternal && isGovernment) {
    await createNotification(
      current.applicant_id,
      `New Update on Facilitation Request: ${current.reference}`,
      `${authorName} posted a coordination update: "${noteText.slice(0, 80)}"`,
      'FACILITATION_NOTE'
    );
  }

  // If reply from applicant and assigned, notify assigned officer
  if (!isGovernment && current.assigned_to) {
    await createNotification(
      current.assigned_to,
      `Applicant Reply on ${current.reference}`,
      `Applicant ${authorName} responded: "${noteText.slice(0, 80)}"`,
      'FACILITATION_NOTE'
    );
  }

  // If linked to an application and author is government officer, record on application timeline
  if (current.application_id && isGovernment) {
    try {
      await recordCoordinationNote(
        current.application_id,
        user.id,
        `[Investor Facilitation Ref ${current.reference}] ${noteText}`,
        'nodal_coordination_note'
      );
    } catch {
      // Non-critical if application event fails
    }
  }

  return current;
}

export async function resolveFacilitationRequest(
  id: string,
  officerUser: { id: string; name?: string; role: string },
  resolutionNotes: string
): Promise<FacilitationRequest> {
  const current = await getFacilitationRequestById(id, officerUser as any);
  const officerName = await resolveUserName(officerUser);

  const now = new Date().toISOString();
  current.status = 'RESOLVED';
  current.resolution_notes = resolutionNotes;
  current.resolved_at = now;
  current.updated_at = now;

  current.timeline.push({
    event: 'REQUEST_RESOLVED',
    timestamp: now,
    actor_name: officerName,
    notes: resolutionNotes,
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      actor_id: officerUser.id,
      action: 'FACILITATION_REQUEST_RESOLVED',
      entity_type: 'FacilitationRequest',
      entity_id: id,
      metadata: current,
      timestamp: new Date(),
    },
  });

  // Notify applicant
  await createNotification(
    current.applicant_id,
    `Facilitation Request Resolved: ${current.reference}`,
    `Your facilitation request has been resolved: ${resolutionNotes.slice(0, 100)}`,
    'FACILITATION_RESOLVED'
  );

  return current;
}

export async function closeFacilitationRequest(
  id: string,
  user: { id: string; name?: string; role: string }
): Promise<FacilitationRequest> {
  const current = await getFacilitationRequestById(id, user as any);
  const userName = await resolveUserName(user);

  const now = new Date().toISOString();
  current.status = 'CLOSED';
  current.updated_at = now;

  current.timeline.push({
    event: 'REQUEST_CLOSED',
    timestamp: now,
    actor_name: userName,
    notes: 'Facilitation request closed',
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      actor_id: user.id,
      action: 'FACILITATION_REQUEST_CLOSED',
      entity_type: 'FacilitationRequest',
      entity_id: id,
      metadata: current,
      timestamp: new Date(),
    },
  });

  return current;
}

