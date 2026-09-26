// Thin mirror of the API contract in IMPLEMENTATION_PLAN.md §7 — extend as
// the frontend needs more shared shapes. Not a full duplicate of the Prisma
// schema; the backend is the source of truth for anything not listed here.

export type Role = 'ENTREPRENEUR' | 'MANAGER' | 'OFFICER' | 'NODAL' | 'INSPECTOR' | 'ADMIN';

export type ProjectApprovalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

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

export interface Project {
  id: string;
  name: string;
  sector: string;
  investment_amount: number;
  employee_count: number;
  stage: string;
  district: string;
  industrial_area: string | null;
}

export interface ApprovalType {
  id: string;
  name: string;
  authority: string;
  category: string;
  description: string;
  purpose: string;
  default_sla_days: number;
  requires_inspection: boolean;
}

export interface ProjectApproval {
  id: string;
  project_id: string;
  approval_type_id: string;
  applicability_reason: string;
  status: ProjectApprovalStatus;
  due_date: string | null;
  blocked_reason: string | null;
  approval_type?: ApprovalType;
}
