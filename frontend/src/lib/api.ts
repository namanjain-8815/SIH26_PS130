const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

// ─── Typed endpoint helpers ────────────────────────────────────────────────

import type {
  ControlCentrePayload,
  DependencyGraphPayload,
  ProjectApprovalDetail,
  ReadinessCheckResult,
  WorkQueueItem,
  AnalyticsSummary,
} from '@/types/api';
import type { Project, ProjectApproval, ApprovalType } from '@/types';

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: { id: string; name: string; email: string; role: string; org_id: string | null; department_id: string | null } }>('/auth/login', { email, password }),
  me: () => api.get<{ id: string; name: string; email: string; role: string; org_id: string | null; department_id: string | null }>('/auth/me'),
};

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (body: Partial<Project>) => api.post<Project>('/projects', body),
  update: (id: string, body: Partial<Project>) => api.patch<Project>(`/projects/${id}`, body),
  runRegulatoryAnalysis: (id: string) => api.post<{ applicable: unknown[]; not_applicable: unknown[] }>(`/projects/${id}/regulatory-analysis`),
  getControlCentre: (id: string) => api.get<ControlCentrePayload>(`/projects/${id}/control-centre`),
  getDependencyGraph: (id: string) => api.get<DependencyGraphPayload>(`/projects/${id}/dependency-graph`),
  getApprovals: (id: string) => api.get<ProjectApproval[]>(`/projects/${id}/approvals`),
  getDocuments: (id: string) => api.get<Document[]>(`/projects/${id}/documents`),
  getMissingDocuments: (id: string) => api.get<unknown[]>(`/projects/${id}/documents/missing`),
  getApplications: (id: string) => api.get<unknown[]>(`/projects/${id}/applications`),
  getIncentives: (id: string) => api.get<unknown[]>(`/projects/${id}/incentives`),
  getCompliance: (id: string) => api.get<unknown[]>(`/projects/${id}/compliance`),
  getSLAStatus: (id: string) => api.get<unknown[]>(`/projects/${id}/sla-status`),
  saveAttributes: (id: string, attributes: Record<string, string>) =>
    api.post(`/projects/${id}/attributes`, { attributes }),
};

// Approval Types
export const approvalTypesApi = {
  list: () => api.get<ApprovalType[]>('/approval-types'),
  get: (id: string) => api.get<ApprovalType>(`/approval-types/${id}`),
};

// Project Approvals
export const projectApprovalsApi = {
  get: (id: string) => api.get<ProjectApprovalDetail>(`/project-approvals/${id}`),
};

// Applications
export const applicationsApi = {
  get: (id: string) => api.get<unknown>(`/applications/${id}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/applications/${id}/status`, { status, notes }),
  getTimeline: (id: string) => api.get<unknown[]>(`/applications/${id}/timeline`),
  runReadinessCheck: (id: string) => api.post<ReadinessCheckResult>(`/applications/${id}/readiness-check`),
  attachDocument: (id: string, document_id: string) =>
    api.post(`/applications/${id}/documents`, { document_id }),
  create: (project_approval_id: string, department_id: string) =>
    api.post<{ id: string; application_number: string }>('/applications', { project_approval_id, department_id }),
};

// Queries
export const queriesApi = {
  list: (applicationId: string) => api.get<unknown[]>(`/applications/${applicationId}/queries`),
  raise: (applicationId: string, body: { subject: string; description: string; priority?: string; deadline?: string }) =>
    api.post(`/applications/${applicationId}/queries`, body),
  respond: (queryId: string, response_text: string) =>
    api.post(`/queries/${queryId}/respond`, { response_text }),
  updateStatus: (queryId: string, status: string) =>
    api.patch(`/queries/${queryId}/status`, { status }),
};

// Inspections
export const inspectionsApi = {
  listProject: (projectId: string) => api.get<unknown[]>(`/projects/${projectId}/inspections`),
  schedule: (data: object) => api.post('/inspections', data),
  update: (id: string, data: object) => api.patch(`/inspections/${id}`, data),
};

// Documents
export const documentsApi = {
  get: (id: string) => api.get<unknown>(`/documents/${id}`),
  update: (id: string, data: object) => api.patch(`/documents/${id}`, data),
  upload: (projectId: string, body: { org_id: string; document_type: string; file_name: string; file_base64: string }) =>
    api.post(`/projects/${projectId}/documents`, body),
};

// Notifications
export const notificationsApi = {
  list: () => api.get<unknown[]>('/notifications'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}`, {}),
  markAllRead: () => api.patch('/notifications/mark-all-read', {}),
};

// Government
export const governmentApi = {
  workQueue: (filters?: { department_id?: string; status?: string; priority?: string; district?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return api.get<WorkQueueItem[]>(`/government/work-queue${params ? `?${params}` : ''}`);
  },
  bottlenecks: () => api.get<unknown>('/government/bottlenecks'),
  analytics: () => api.get<AnalyticsSummary>('/government/analytics'),
  slaMonitor: (department_id?: string) =>
    api.get<unknown[]>(`/government/sla-monitor${department_id ? `?department_id=${department_id}` : ''}`),
};

// Admin
export const adminApi = {
  approvalTypes: {
    list: () => api.get('/admin/approval-types'),
    create: (data: object) => api.post('/admin/approval-types', data),
    update: (id: string, data: object) => api.patch(`/admin/approval-types/${id}`, data),
    delete: (id: string) => api.delete(`/admin/approval-types/${id}`),
  },
  auditLog: (filters?: { entity_type?: string; actor_id?: string; action?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return api.get<unknown[]>(`/admin/audit-log${params ? `?${params}` : ''}`);
  },
};
