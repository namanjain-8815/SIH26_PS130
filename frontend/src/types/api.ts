// Extended API response types — mirrors backend service return shapes
// Backend is the source of truth; these are convenience types for the UI layer.

export interface ControlCentrePayload {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    industrial_area: string | null;
    investment_amount: number;
    employee_count: number;
    stage: string;
    organization: { id: string; legal_name: string; entity_type: string };
  };
  readiness: { percent: number; label: string };
  approvals: { total: number; completed: number; in_progress: number; blocked: number; not_started: number };
  blocked_approvals: Array<{ id: string; approval_name: string; blocked_reason: string | null; priority: string }>;
  sla_alerts: Array<{ approval_name: string; application_id?: string | null; application_number: string | null; sla_status: string | null; due_date: string | null }>;
  pending_queries: Array<{ query_id: string; application_id?: string | null; subject: string; priority: string; status: string; deadline: string | null; application_number: string | null; approval_name: string }>;
  upcoming_inspections: Array<{ inspection_id: string; application_id?: string | null; scheduled_date: string; location: string | null; purpose: string | null; approval_name: string; application_number: string | null }>;
  upcoming_renewals: Array<{ id: string; name: string; authority: string; frequency: string; next_due_date: string; status: string }>;
  incentive_matches: Array<{ id: string; scheme_name: string; authority: string; benefit_description: string; status: string; label: string }>;
  bottleneck: { approval_name: string; reason: string; status: string } | null;
  next_best_action: string | null;
  next_best_action_link?: string | null;
}

export interface DependencyGraphPayload {
  nodes: Array<{
    id: string;
    type: string;
    data: {
      label: string;
      authority: string;
      category: string;
      status: string;
      priority: string;
      due_date: string | null;
      can_start_now: boolean;
      requires_inspection: boolean;
      default_sla_days: number;
      sla_status: string | null;
      open_queries: number;
      application_id: string | null;
      application_status: string | null;
      blocked_reason: string | null;
    };
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    label: string;
    animated: boolean;
  }>;
  summary: { total: number; completed: number; blocked: number; can_start_now: number };
}

export interface ProjectApprovalDetail {
  id: string;
  approval_type: {
    id: string;
    name: string;
    description: string;
    purpose: string;
    category: string;
    source_reference: string | null;
    requires_inspection: boolean;
    renewal_period_days: number | null;
  };
  applicability_reason: string;
  authority: string;
  required_documents: Array<{ id: string; document_type: string; mandatory: boolean; condition: string | null }>;
  prerequisites: Array<{ approval_type_id: string; name: string; dependency_type: string; status: string; project_approval_id: string | null }>;
  downstream: Array<{ approval_type_id: string; name: string; dependency_type: string; status: string; project_approval_id: string | null }>;
  status: string;
  priority: string;
  blocked_reason: string | null;
  due_date: string | null;
  actual_completion_date: string | null;
  sla: { configured_duration_days: number; start_event: string; escalation_level: string; instance_status: string | null; due_date: string | null; time_remaining: string | null; label: string } | null;
  application: {
    id: string;
    application_number: string;
    status: string;
    submitted_at: string | null;
    department: { id: string; name: string } | null;
    open_queries: number;
    upcoming_inspections: number;
    timeline_events: Array<{ id: string; event_type: string; timestamp: string; notes: string | null }>;
    documents_attached: number;
  } | null;
  next_action: string;
}

export interface ReadinessCheckResult {
  ready: boolean;
  application_number: string;
  approval_name: string;
  checked_at: string;
  issues: string[];
  warnings: string[];
  checks: Array<{ description: string; status: 'pass' | 'fail' | 'warn' }>;
  label: string;
}

export interface WorkQueueItem {
  id: string;
  application_number: string;
  status: string;
  submitted_at: string | null;
  due_date: string | null;
  approval_name: string;
  approval_category: string;
  priority: string;
  org_name: string;
  project_name: string;
  district: string;
  department_name: string;
  sla_status: string | null;
  sla_due_date: string | null;
  open_queries: number;
  upcoming_inspections: number;
}

export interface AnalyticsSummary {
  applications_by_status: Record<string, number>;
  total_applications: number;
  average_processing_days: number | null;
  sla: {
    breached: number;
    at_risk: number;
    on_track: number;
    completed: number;
    total: number;
    label: string;
  };
  applications_by_district: Record<string, number>;
  label: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface QueryItem {
  id: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'RESPONDED' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
  deadline: string | null;
  created_at: string;
  creator?: { id: string; name: string; role: string };
  responses: Array<{ id: string; response_text: string; created_by: string; created_at: string }>;
}

export interface DocumentItem {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  expiry_date: string | null;
  issued_date: string | null;
  created_at: string;
  reuse_count: number;
  is_expiring_soon: boolean;
  is_expired: boolean;
}

export interface ComplianceItem {
  id: string;
  name: string;
  authority: string;
  frequency: string;
  next_due_date: string;
  status: string;
  days_until_due: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  is_due_soon: boolean;
}

export interface IncentiveMatch {
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
}

export interface ApplicationTimelineEvent {
  id: string;
  event_type: string;
  timestamp: string;
  notes: string | null;
  actor_id?: string | null;
  actor?: { id: string; name: string; role: string } | null;
}

export interface ApplicationDetail {
  id: string;
  application_number: string;
  status: string;
  submitted_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  department_id: string;
  department: { id: string; name: string; state?: string; district?: string };
  project_approval: {
    id: string;
    project_id: string;
    approval_type: {
      id: string;
      name: string;
      authority: string;
      category?: string;
      description?: string;
      default_sla_days?: number;
      document_requirements: Array<{ id: string; document_type: string; mandatory: boolean; condition?: string | null }>;
    };
    project: {
      id: string;
      name: string;
      sector: string;
      district: string;
      org_id: string;
    };
  };
  application_documents: Array<{
    id: string;
    application_id: string;
    document_id: string;
    validation_status: string;
    validation_notes?: string | null;
    document: DocumentItem;
  }>;
  queries: QueryItem[];
  inspections: Array<{
    id: string;
    scheduled_date: string;
    status: string;
    location: string | null;
    purpose: string | null;
    inspector: { id: string; name: string; email: string } | null;
    findings: Array<{ id: string; severity: string; description: string; corrective_action: string | null; status: string }>;
  }>;
  sla_instance: { id: string; status: string; due_date: string | null } | null;
  events: ApplicationTimelineEvent[];
}
