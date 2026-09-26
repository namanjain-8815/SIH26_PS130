export type Role = 'ENTREPRENEUR' | 'MANAGER' | 'OFFICER' | 'NODAL' | 'INSPECTOR' | 'ADMIN';
export const Role = {
  ENTREPRENEUR: 'ENTREPRENEUR',
  MANAGER: 'MANAGER',
  OFFICER: 'OFFICER',
  NODAL: 'NODAL',
  INSPECTOR: 'INSPECTOR',
  ADMIN: 'ADMIN',
} as const;

export type ProjectApprovalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
export const ProjectApprovalStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
} as const;

export type ApplicationStatus =
  | 'NOT_STARTED'
  | 'READY_TO_START'
  | 'IN_PREPARATION'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'QUERY_RAISED'
  | 'INSPECTION_PENDING'
  | 'INSPECTION_SCHEDULED'
  | 'AWAITING_APPLICANT'
  | 'AWAITING_DEPARTMENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';
export const ApplicationStatus = {
  NOT_STARTED: 'NOT_STARTED',
  READY_TO_START: 'READY_TO_START',
  IN_PREPARATION: 'IN_PREPARATION',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  QUERY_RAISED: 'QUERY_RAISED',
  INSPECTION_PENDING: 'INSPECTION_PENDING',
  INSPECTION_SCHEDULED: 'INSPECTION_SCHEDULED',
  AWAITING_APPLICANT: 'AWAITING_APPLICANT',
  AWAITING_DEPARTMENT: 'AWAITING_DEPARTMENT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
} as const;

export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export const DocumentVerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type ApplicationDocValidationStatus = 'PENDING' | 'VALID' | 'INVALID';
export const ApplicationDocValidationStatus = {
  PENDING: 'PENDING',
  VALID: 'VALID',
  INVALID: 'INVALID',
} as const;

export type QueryStatus = 'OPEN' | 'RESPONDED' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
export const QueryStatus = {
  OPEN: 'OPEN',
  RESPONDED: 'RESPONDED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
} as const;

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type InspectionStatus = 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
export const InspectionStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  RESCHEDULED: 'RESCHEDULED',
  CANCELLED: 'CANCELLED',
} as const;

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export const FindingSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED';
export const SLAStatus = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  BREACHED: 'BREACHED',
  COMPLETED: 'COMPLETED',
} as const;

export type IncentiveMatchStatus = 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'APPLIED';
export const IncentiveMatchStatus = {
  POTENTIALLY_ELIGIBLE: 'POTENTIALLY_ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  APPLIED: 'APPLIED',
} as const;

export type ComplianceStatus = 'UPCOMING' | 'DUE' | 'OVERDUE' | 'COMPLETED';
export const ComplianceStatus = {
  UPCOMING: 'UPCOMING',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  COMPLETED: 'COMPLETED',
} as const;

export type DependencyType = 'PREREQUISITE' | 'PARALLEL_OK' | 'OPTIONAL';
export const DependencyType = {
  PREREQUISITE: 'PREREQUISITE',
  PARALLEL_OK: 'PARALLEL_OK',
  OPTIONAL: 'OPTIONAL',
} as const;

// ---------------------------------------------------------------------------
// Model Entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  org_id: string | null;
  department_id: string | null;
  status: string;
  created_at: Date | string;
  organization?: Organization | null;
  department?: Department | null;
  application_events?: ApplicationEvent[];
  audit_logs?: AuditLog[];
  notifications?: Notification[];
  queries_created?: Query[];
  queries_assigned?: Query[];
  query_responses?: QueryResponse[];
  inspections?: Inspection[];
}

export interface Organization {
  id: string;
  legal_name: string;
  entity_type: string;
  sector: string;
  created_at: Date | string;
  users?: User[];
  projects?: Project[];
  documents?: Document[];
}

export interface Department {
  id: string;
  name: string;
  state: string;
  district: string;
  officers?: User[];
  applications?: Application[];
  inspections?: Inspection[];
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  type?: string | null;
  sector: string;
  investment_amount: number;
  employee_count: number;
  stage: string;
  district: string;
  industrial_area?: string | null;
  address?: string | null;
  target_start_date?: Date | string | null;
  created_at: Date | string;
  organization?: Organization;
  attributes?: ProjectAttribute[];
  project_approvals?: ProjectApproval[];
  documents?: Document[];
  incentive_matches?: IncentiveMatch[];
  compliance_requirements?: ComplianceRequirement[];
}

export interface ProjectAttribute {
  id: string;
  project_id: string;
  key: string;
  value: string;
  project?: Project;
}

export interface ApprovalType {
  id: string;
  name: string;
  authority: string;
  category: string;
  description: string;
  purpose: string;
  default_sla_days: number;
  renewal_period_days?: number | null;
  requires_inspection: boolean;
  source_reference?: string | null;
  active: boolean;
  created_at: Date | string;
  applicability_rules?: ApplicabilityRule[];
  document_requirements?: DocumentRequirement[];
  project_approvals?: ProjectApproval[];
  sla_policies?: SLAPolicy[];
  prerequisite_for?: ApprovalDependency[];
  dependent_on?: ApprovalDependency[];
}

export interface ApplicabilityRule {
  id: string;
  approval_type_id: string;
  rule_name: string;
  conditions: any;
  jurisdiction: string;
  sector?: string | null;
  effective_from: Date | string;
  effective_to?: Date | string | null;
  source_reference?: string | null;
  active: boolean;
  approval_type?: ApprovalType;
}

export interface ApprovalDependency {
  id: string;
  prerequisite_approval_type_id: string;
  dependent_approval_type_id: string;
  dependency_type: DependencyType;
  prerequisite_approval?: ApprovalType;
  dependent_approval?: ApprovalType;
}

export interface ProjectApproval {
  id: string;
  project_id: string;
  approval_type_id: string;
  applicability_reason: string;
  status: ProjectApprovalStatus;
  priority: Priority;
  due_date?: Date | string | null;
  actual_completion_date?: Date | string | null;
  blocked_reason?: string | null;
  created_at: Date | string;
  project?: Project;
  approval_type?: ApprovalType;
  application?: Application | null;
}

export interface DocumentRequirement {
  id: string;
  approval_type_id: string;
  document_type: string;
  mandatory: boolean;
  condition?: string | null;
  approval_type?: ApprovalType;
}

export interface Document {
  id: string;
  org_id: string;
  project_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  version: number;
  verification_status: DocumentVerificationStatus;
  issued_date?: Date | string | null;
  expiry_date?: Date | string | null;
  created_at: Date | string;
  organization?: Organization;
  project?: Project;
  application_documents?: ApplicationDocument[];
}

export interface Application {
  id: string;
  project_approval_id: string;
  department_id: string;
  application_number: string;
  status: ApplicationStatus;
  submitted_at?: Date | string | null;
  due_date?: Date | string | null;
  completed_at?: Date | string | null;
  created_at: Date | string;
  project_approval?: ProjectApproval;
  department?: Department;
  application_documents?: ApplicationDocument[];
  events?: ApplicationEvent[];
  queries?: Query[];
  inspections?: Inspection[];
  sla_instance?: SLAInstance | null;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_id: string;
  validation_status: ApplicationDocValidationStatus;
  validation_notes?: string | null;
  application?: Application;
  document?: Document;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  actor_id?: string | null;
  event_type: string;
  timestamp: Date | string;
  notes?: string | null;
  metadata?: any;
  application?: Application;
  actor?: User | null;
}

export interface Query {
  id: string;
  application_id: string;
  created_by: string;
  assigned_to?: string | null;
  subject: string;
  description: string;
  priority: Priority;
  deadline?: Date | string | null;
  status: QueryStatus;
  created_at: Date | string;
  application?: Application;
  creator?: User;
  assignee?: User | null;
  responses?: QueryResponse[];
}

export interface QueryResponse {
  id: string;
  query_id: string;
  created_by: string;
  response_text: string;
  created_at: Date | string;
  query?: Query;
  author?: User;
}

export interface Inspection {
  id: string;
  application_id: string;
  department_id: string;
  inspector_id?: string | null;
  scheduled_date: Date | string;
  status: InspectionStatus;
  location?: string | null;
  purpose?: string | null;
  created_at: Date | string;
  application?: Application;
  department?: Department;
  inspector?: User | null;
  findings?: InspectionFinding[];
}

export interface InspectionFinding {
  id: string;
  inspection_id: string;
  severity: FindingSeverity;
  description: string;
  corrective_action?: string | null;
  status: string;
  inspection?: Inspection;
}

export interface SLAPolicy {
  id: string;
  approval_type_id: string;
  duration_days: number;
  start_event: string;
  escalation_level?: string | null;
  approval_type?: ApprovalType;
}

export interface SLAInstance {
  id: string;
  application_id: string;
  due_date: Date | string;
  status: SLAStatus;
  breached: boolean;
  breach_duration?: number | null;
  application?: Application;
}

export interface IncentiveScheme {
  id: string;
  name: string;
  authority: string;
  description: string;
  eligibility_rules: any;
  benefit_description: string;
  deadline?: Date | string | null;
  source_reference?: string | null;
  created_at: Date | string;
  matches?: IncentiveMatch[];
}

export interface IncentiveMatch {
  id: string;
  project_id: string;
  incentive_scheme_id: string;
  matching_reasons: any;
  status: IncentiveMatchStatus;
  created_at: Date | string;
  project?: Project;
  incentive_scheme?: IncentiveScheme;
}

export interface ComplianceRequirement {
  id: string;
  project_id: string;
  name: string;
  authority: string;
  frequency: string;
  next_due_date: Date | string;
  status: ComplianceStatus;
  linked_approval_id?: string | null;
  created_at: Date | string;
  project?: Project;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: Date | string;
  before_data?: any;
  after_data?: any;
  metadata?: any;
  actor?: User | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: Date | string;
  user?: User;
}
