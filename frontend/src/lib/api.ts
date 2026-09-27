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
  RegulatoryAnalysisResult,
  ProjectSubmissionCentreData,
  SubmitApplicationResponse,
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
  create: (body: Partial<Project> & { entity_name?: string; entity_type?: string }) => api.post<Project>('/projects', body),
  update: (id: string, body: Partial<Project>) => api.patch<Project>(`/projects/${id}`, body),
  runRegulatoryAnalysis: (id: string) => api.post<RegulatoryAnalysisResult>(`/projects/${id}/regulatory-analysis`),
  getControlCentre: (id: string) => api.get<ControlCentrePayload>(`/projects/${id}/control-centre`),
  getDependencyGraph: (id: string) => api.get<DependencyGraphPayload>(`/projects/${id}/dependency-graph`),
  getApprovals: (id: string) => api.get<ProjectApproval[]>(`/projects/${id}/approvals`),
  getDocuments: (id: string) => api.get<import('@/types/api').DocumentItem[]>(`/projects/${id}/documents`),
  getMissingDocuments: (id: string) => api.get<unknown[]>(`/projects/${id}/documents/missing`),
  getApplications: (id: string) => api.get<unknown[]>(`/projects/${id}/applications`),
  getIncentives: (id: string) => api.get<unknown[]>(`/projects/${id}/incentives`),
  getCompliance: (id: string) => api.get<unknown[]>(`/projects/${id}/compliance`),
  getSLAStatus: (id: string) => api.get<unknown[]>(`/projects/${id}/sla-status`),
  saveAttributes: (id: string, attributes: Record<string, string>) =>
    api.post(`/projects/${id}/attributes`, attributes),
  startEligibleApplications: (id: string) =>
    api.post<{
      started: Array<{
        project_approval_id: string;
        approval_name: string;
        authority: string;
        application_id: string;
        application_number: string;
        status: string;
      }>;
      already_active: Array<{
        project_approval_id: string;
        approval_name: string;
        application_id: string;
        application_number: string;
        status: string;
      }>;
      blocked_by_prerequisites: Array<{
        project_approval_id: string;
        approval_name: string;
        missing_prerequisites: string[];
      }>;
      summary: {
        started_count: number;
        already_active_count: number;
        blocked_count: number;
      };
    }>(`/projects/${id}/start-eligible-applications`),
  getSubmissionCentre: (id: string) => api.get<ProjectSubmissionCentreData>(`/projects/${id}/submission-centre`),
  submitApplication: (projectId: string, applicationId: string, notes?: string) =>
    api.post<SubmitApplicationResponse>(`/projects/${projectId}/submit-application/${applicationId}`, { notes }),
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
  get: (id: string) => api.get<import('@/types/api').ApplicationDetail>(`/applications/${id}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch<{ id: string; status: string }>(`/applications/${id}/status`, { status, notes }),
  getTimeline: (id: string) => api.get<import('@/types/api').ApplicationTimelineEvent[]>(`/applications/${id}/timeline`),
  runReadinessCheck: (id: string) => api.post<ReadinessCheckResult>(`/applications/${id}/readiness-check`),
  attachDocument: (id: string, document_id: string) =>
    api.post(`/applications/${id}/documents`, { document_id }),
  detachDocument: (id: string, document_id: string) =>
    api.delete(`/applications/${id}/documents/${document_id}`),
  recordCoordinationNote: (id: string, body: { note: string; event_type?: string }) =>
    api.post(`/applications/${id}/coordination-note`, body),
  escalate: (id: string, reason?: string) =>
    api.post<{ success: boolean; message: string }>(`/applications/${id}/escalate`, { reason }),
  create: (project_approval_id: string, department_id?: string) =>
    api.post<{ id: string; application_number: string }>('/applications', { project_approval_id, department_id }),
  getScrutinyPriority: (id: string) =>
    api.get<import('@/types/api').ScrutinyPriorityResult>(`/applications/${id}/scrutiny-priority`),
};

// Queries
export const queriesApi = {
  list: (applicationId: string) => api.get<import('@/types/api').QueryItem[]>(`/applications/${applicationId}/queries`),
  raise: (applicationId: string, body: { subject: string; description: string; priority?: string; deadline?: string; assigned_to?: string }) =>
    api.post(`/applications/${applicationId}/queries`, body),
  respond: (queryId: string, response_text: string) =>
    api.post(`/queries/${queryId}/respond`, { response_text }),
  updateStatus: (queryId: string, status: string) =>
    api.patch(`/queries/${queryId}/status`, { status }),
  escalate: (queryId: string) =>
    api.patch(`/queries/${queryId}/status`, { status: 'ESCALATED' }),
};

// Inspections
export const inspectionsApi = {
  listProject: (projectId: string) => api.get<unknown[]>(`/projects/${projectId}/inspections`),
  listPlanner: (params?: { department_id?: string; inspector_id?: string; status?: string; date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.inspector_id) qs.set('inspector_id', params.inspector_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<import('@/types/api').PlannerInspection[]>(`/inspections${query}`);
  },
  listInspectors: () => api.get<import('@/types/api').InspectorUser[]>('/inspectors'),
  schedule: (data: object) => api.post('/inspections', data),
  update: (id: string, data: object) => api.patch(`/inspections/${id}`, data),
  recordFinding: (inspectionId: string, data: object) => api.post(`/inspections/${inspectionId}/findings`, data),
  updateFinding: (findingId: string, data: object) => api.patch(`/inspections/findings/${findingId}`, data),
};

// Documents
export const documentsApi = {
  get: (id: string) => api.get<import('@/types/api').DocumentItem>(`/documents/${id}`),
  update: (id: string, data: object) => api.patch(`/documents/${id}`, data),
  upload: (projectId: string, body: { org_id?: string; document_type: string; file_name: string; file_base64: string; expiry_date?: string; issued_date?: string; application_id?: string }) =>
    api.post<import('@/types/api').DocumentItem>(`/projects/${projectId}/documents`, body),
  replace: (id: string, body: { file_name: string; file_base64: string; expiry_date?: string }) =>
    api.post<import('@/types/api').DocumentItem>(`/documents/${id}/replace`, body),
  preValidate: (body: {
    document_type: string;
    file_name: string;
    file_base64?: string;
    size_bytes?: number;
    project_id?: string;
    expiry_date?: string;
  }) => api.post<import('@/types/api').DocumentPreValidationResult>('/documents/pre-validate', body),
};

// Notifications
export const notificationsApi = {
  list: () => api.get<unknown[]>('/notifications'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}`, {}),
  markAllRead: () => api.patch('/notifications/mark-all-read', {}),
};

// Compliance
export const complianceApi = {
  list: (projectId: string) => api.get<import('@/types/api').ComplianceItem[]>(`/projects/${projectId}/compliance`),
  complete: (id: string) => api.patch(`/compliance/${id}/complete`, {}),
  remind: (projectId: string) => api.post<{ success: boolean; reminders_sent: number }>(`/projects/${projectId}/compliance/remind`, {}),
};

// Incentives
export const incentivesApi = {
  list: (projectId: string) => api.get<Array<{
    id: string;
    status: string;
    matching_reasons: string[];
    scheme: {
      id: string;
      name: string;
      authority: string;
      description: string;
      benefit_description: string;
      deadline: string | null;
      source_reference: string | null;
    };
    label: string;
  }>>(`/projects/${projectId}/incentives`),
  updateStatus: (matchId: string, status: string) =>
    api.patch(`/incentives/${matchId}/status`, { status }),
  allSchemes: () => api.get<unknown[]>('/incentive-schemes'),
};

// Government
export const governmentApi = {
  departments: () =>
    api.get<Array<{ id: string; name: string; state: string; district: string }>>('/government/departments'),
  workQueue: (filters?: { department_id?: string; status?: string; priority?: string; district?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v && v !== 'undefined' && v !== 'null') {
          params.append(k, v);
        }
      }
    }
    const query = params.toString();
    return api.get<WorkQueueItem[]>(`/government/work-queue${query ? `?${query}` : ''}`);
  },
  bottlenecks: (department_id?: string) => {
    const valid = department_id && department_id !== 'undefined' && department_id !== 'null';
    return api.get<any>(`/government/bottlenecks${valid ? `?department_id=${department_id}` : ''}`);
  },
  analytics: (department_id?: string) => {
    const valid = department_id && department_id !== 'undefined' && department_id !== 'null';
    return api.get<any>(`/government/analytics${valid ? `?department_id=${department_id}` : ''}`);
  },
  slaMonitor: (department_id?: string) => {
    const valid = department_id && department_id !== 'undefined' && department_id !== 'null';
    return api.get<unknown[]>(`/government/sla-monitor${valid ? `?department_id=${department_id}` : ''}`);
  },
  evaluateSla: () => api.post<{ evaluated_count: number; evaluations: unknown[] }>('/government/sla-monitor/evaluate', {}),
};

// Admin
export const adminApi = {
  approvalTypes: {
    list: () => api.get<Array<{
      id: string;
      name: string;
      authority: string;
      category: string;
      description: string;
      purpose: string;
      default_sla_days: number;
      renewal_period_days: number | null;
      requires_inspection: boolean;
      source_reference: string | null;
    }>>('/admin/approval-types'),
    create: (data: object) => api.post('/admin/approval-types', data),
    update: (id: string, data: object) => api.patch(`/admin/approval-types/${id}`, data),
    delete: (id: string) => api.delete(`/admin/approval-types/${id}`),
  },
  rules: {
    list: () => api.get<Array<{
      id: string;
      approval_type_id: string;
      jurisdiction: string | null;
      sector: string | null;
      active: boolean;
      effective_from: string | null;
      effective_to: string | null;
      approval_type?: { name: string; authority: string };
      conditions: unknown;
    }>>('/admin/rules'),
    create: (data: object) => api.post('/admin/rules', data),
    update: (id: string, data: object) => api.patch(`/admin/rules/${id}`, data),
    delete: (id: string) => api.delete(`/admin/rules/${id}`),
  },
  dependencies: {
    list: () => api.get<Array<{
      id: string;
      dependency_type: string;
      prerequisite_approval_type_id: string;
      dependent_approval_type_id: string;
      prerequisite_approval_type?: { name: string; authority: string };
      dependent_approval_type?: { name: string; authority: string };
    }>>('/admin/dependencies'),
    create: (data: object) => api.post('/admin/dependencies', data),
    update: (id: string, data: object) => api.patch(`/admin/dependencies/${id}`, data),
    delete: (id: string) => api.delete(`/admin/dependencies/${id}`),
  },
  slaPolicies: {
    list: () => api.get<Array<{
      id: string;
      approval_type_id: string;
      duration_days: number;
      start_event: string;
      escalation_level: string;
      approval_type?: { name: string; authority: string };
    }>>('/admin/sla-policies'),
    create: (data: object) => api.post('/admin/sla-policies', data),
    update: (id: string, data: object) => api.patch(`/admin/sla-policies/${id}`, data),
    delete: (id: string) => api.delete(`/admin/sla-policies/${id}`),
  },
  incentiveSchemes: {
    list: () => api.get<Array<{
      id: string;
      name: string;
      authority: string;
      description: string;
      benefit_description: string;
      deadline: string | null;
      source_reference: string | null;
    }>>('/admin/incentive-schemes'),
    create: (data: object) => api.post('/admin/incentive-schemes', data),
    update: (id: string, data: object) => api.patch(`/admin/incentive-schemes/${id}`, data),
    delete: (id: string) => api.delete(`/admin/incentive-schemes/${id}`),
  },
  auditLog: (filters?: { entity_type?: string; actor_id?: string; action?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return api.get<unknown[]>(`/admin/audit-log${params ? `?${params}` : ''}`);
  },
};

// Facilitation & Investor Assistance
export const facilitationApi = {
  list: (filters?: { status?: string; category?: string; priority?: string; project_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.category && filters.category !== 'ALL') params.set('category', filters.category);
    if (filters?.priority && filters.priority !== 'ALL') params.set('priority', filters.priority);
    if (filters?.project_id && filters.project_id !== 'ALL') params.set('project_id', filters.project_id);
    const qs = params.toString();
    return api.get<import('@/types/api').FacilitationRequest[]>(`/facilitation${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<import('@/types/api').FacilitationRequest>(`/facilitation/${id}`),
  create: (body: {
    category: string;
    subject: string;
    description: string;
    project_id?: string;
    application_id?: string;
    priority?: string;
  }) => api.post<import('@/types/api').FacilitationRequest>('/facilitation', body),
  claim: (id: string, desk?: string) =>
    api.post<import('@/types/api').FacilitationRequest>(`/facilitation/${id}/claim`, { desk }),
  addNote: (id: string, note: string, is_internal?: boolean) =>
    api.post<import('@/types/api').FacilitationRequest>(`/facilitation/${id}/notes`, { note, is_internal }),
  resolve: (id: string, resolution_notes: string) =>
    api.post<import('@/types/api').FacilitationRequest>(`/facilitation/${id}/resolve`, { resolution_notes }),
  close: (id: string) => api.post<import('@/types/api').FacilitationRequest>(`/facilitation/${id}/close`),
};

// Prescribed Forms & Templates (P1.8)
export const formsApi = {
  list: () => api.get<import('@/types/api').PrescribedForm[]>('/prescribed-forms'),
  get: (id: string) => api.get<import('@/types/api').PrescribedForm>(`/prescribed-forms/${id}`),
  downloadUrl: (id: string) => `/api/prescribed-forms/${id}/download`,
  getForApprovalType: (approvalTypeId: string) =>
    api.get<import('@/types/api').PrescribedForm | null>(`/approval-types/${approvalTypeId}/prescribed-form`),
};

