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
    address?: string | null;
    target_start_date?: string | null;
    organization: {
      id: string;
      legal_name: string;
      entity_type: string;
      pan?: string;
      gstin?: string;
      cin?: string;
      registered_address?: string;
    };
    attributes?: Array<{ key: string; value: string }>;
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
  prescribed_form?: PrescribedForm | null;
}

export interface PrescribedForm {
  id: string;
  form_name: string;
  document_type: string;
  authority?: string;
  source_label: string;
  source_url?: string;
  is_online_application?: boolean;
  official_online_url?: string;
  online_portal_name?: string;
  provenance_status?: 'VERIFIED_OFFICIAL_DOCUMENT' | 'OFFICIAL_ONLINE_PORTAL' | 'CONFIGURABLE_DEMONSTRATION';
  category: 'Statutory Prescribed Format' | 'Demonstration / Configurable Form';
  version: string;
  effective_date: string;
  description: string;
  file_name: string;
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
  cross_document_consistency?: CrossDocumentConsistencyResult;
}

export type ScrutinyPriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScrutinyContributingFactor {
  factor: string;
  category: 'DOCUMENTATION' | 'DEPENDENCY' | 'MULTI_AGENCY' | 'INSPECTION' | 'CLARIFICATION' | 'SLA_TIMELINE' | 'FINDINGS';
  severity: 'INFO' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  impact_score: number;
}

export interface ScrutinyPriorityResult {
  level: ScrutinyPriorityLevel;
  score: number;
  label: string;
  factors: string[];
  contributing_factors?: ScrutinyContributingFactor[];
  why: string;
  metrics: {
    missing_documents: number;
    required_documents: number;
    uploaded_documents: number;
    prerequisite_count: number;
    pending_prerequisites: number;
    concerned_authorities: number;
    requires_inspection: boolean;
    open_queries: number;
    sla_status: string | null;
    critical_findings_count: number;
  };
  disclaimer: string;
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
  department_id?: string;
  department_name: string;
  sla_status: string | null;
  sla_due_date: string | null;
  open_queries: number;
  upcoming_inspections: number;
  scrutiny_priority?: ScrutinyPriorityResult;
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
  is_file_available?: boolean;
  extracted_field_count?: number;
  extraction_status?: string;
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
  scrutiny_priority?: ScrutinyPriorityResult;
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
      prescribed_form?: PrescribedForm | null;
    };
    project: {
      id: string;
      name: string;
      sector: string;
      district: string;
      org_id: string;
      type?: string | null;
      investment_amount?: number;
      employee_count?: number;
      stage?: string;
      industrial_area?: string | null;
      address?: string | null;
      target_start_date?: string | null;
      organization?: {
        id: string;
        legal_name: string;
        entity_type: string;
        sector?: string;
      } | null;
      attributes?: Array<{ id?: string; key: string; value: string }>;
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

export interface RegulatoryAnalysisResult {
  approvals: Array<{
    id: string;
    name: string;
    description: string;
    purpose?: string;
    authority: string;
    category: string;
    default_sla_days?: number;
    requires_inspection?: boolean;
    applicability_reason?: string;
    can_proceed_in_parallel?: boolean;
    prerequisites?: Array<{ id: string; name: string }>;
  }>;
  reasons: Record<string, string>;
  documents: Array<{
    id: string;
    approval_type_id: string;
    document_type: string;
    name: string;
    is_mandatory: boolean;
  }>;
  dependencies: Array<{
    id: string;
    prerequisite_approval_type_id: string;
    dependent_approval_type_id: string;
    dependency_type: string;
    prerequisite_approval?: { id: string; name: string };
    dependent_approval?: { id: string; name: string };
  }>;
  incentives: Array<{
    scheme: {
      id: string;
      name: string;
      authority: string;
      benefit_description: string;
    };
    reason: string;
  }>;
  warnings: string[];
  summary?: {
    total: number;
    parallel_count: number;
    prerequisite_dependent_count: number;
    documents_count: number;
    incentives_count: number;
  };
}

export type FacilitationCategory =
  | 'Approval Guidance'
  | 'Documentation Help'
  | 'Application Processing Help'
  | 'Incentive / Scheme Guidance'
  | 'Compliance & Renewal Help'
  | 'General Facilitation';

export type FacilitationStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface FacilitationNote {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  note: string;
  created_at: string;
  is_internal?: boolean;
}

export interface FacilitationTimelineItem {
  event: string;
  timestamp: string;
  actor_name: string;
  notes?: string;
}

export interface FacilitationRequest {
  id: string;
  reference: string;
  applicant_id: string;
  applicant_name: string;
  applicant_email: string;
  category: FacilitationCategory;
  subject: string;
  description: string;
  project_id?: string | null;
  project_name?: string | null;
  application_id?: string | null;
  application_number?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: FacilitationStatus;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  responsible_desk: string;
  resolution_notes?: string | null;
  notes: FacilitationNote[];
  timeline: FacilitationTimelineItem[];
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface DocumentPreValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface DocumentPreValidationResult {
  accepted: boolean;
  status: 'ACCEPTED' | 'REJECTED' | 'MANUAL_VERIFICATION_REQUIRED';
  document_type: string;
  file_name: string;
  detected_type?: string;
  errors: string[];
  warnings: string[];
  checks: DocumentPreValidationCheck[];
  metadata?: {
    file_name: string;
    size_bytes: number;
    extension: string;
    is_scanned_or_image?: boolean;
  };
}

export interface InspectorUser {
  id: string;
  name: string;
  email: string;
  department_id?: string | null;
}

export interface PlannerInspection {
  id: string;
  application_id: string;
  department_id: string;
  inspector_id?: string | null;
  scheduled_date: string;
  location?: string | null;
  purpose?: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
  has_conflict?: boolean;
  conflict_reason?: string | null;
  department: { id: string; name: string };
  inspector?: { id: string; name: string; email: string; department_id?: string | null } | null;
  application: {
    id: string;
    application_number: string;
    status: string;
    due_date: string | null;
    project_approval?: {
      approval_type?: { name: string; category?: string; authority: string };
      project?: {
        id: string;
        name: string;
        district: string;
        industrial_area?: string | null;
        address?: string | null;
        organization?: { legal_name: string } | null;
      };
    };
  };
  findings?: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    corrective_action?: string | null;
    status: string;
  }>;
}

export interface JointInspectionDepartmentItem {
  inspection_id: string;
  department_id: string;
  department_name: string;
  approval_type_id: string;
  approval_name: string;
  application_id: string;
  application_number: string;
  inspector_id?: string | null;
  inspector_name?: string | null;
  inspector_email?: string | null;
  status: string;
  findings: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    corrective_action: string | null;
    status: string;
  }>;
  has_conflict: boolean;
  conflict_reason?: string | null;
}

export interface JointInspectionPlan {
  id: string;
  project_id: string;
  project_name: string;
  organization_name: string;
  district: string;
  location: string;
  scheduled_date: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'RESCHEDULED' | 'MIXED';
  total_departments: number;
  departments: JointInspectionDepartmentItem[];
  conflict_warnings: string[];
  has_conflicts: boolean;
  findings_summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  consolidated_findings: Array<{
    id: string;
    inspection_id: string;
    department_name: string;
    approval_name: string;
    severity: string;
    description: string;
    corrective_action: string | null;
    status: string;
  }>;
}

export interface ProjectJointInspectionsResponse {
  project: {
    id: string;
    name: string;
    district: string;
    organization: string;
  };
  joint_plans: JointInspectionPlan[];
  clearances_requiring_inspection: Array<{
    approval_type_id: string;
    approval_name: string;
    department_name: string;
    department_id: string | null;
    application_id: string | null;
    application_number: string | null;
    application_status: string | null;
    has_scheduled_inspection: boolean;
    latest_inspection_id: string | null;
    latest_inspection_status: string | null;
    latest_inspection_date: string | null;
  }>;
  coordination_opportunities: string[];
  summary: {
    total_joint_visits: number;
    completed_visits: number;
    upcoming_visits: number;
    total_findings: number;
    unresolved_findings: number;
  };
}

export interface SubmissionCentreItem {
  project_approval_id: string;
  approval_name: string;
  approval_category: string;
  concerned_authority: string;
  department_name?: string;
  priority: string;
  category: 'READY_TO_SUBMIT' | 'BLOCKED_BY_PREREQUISITES' | 'IN_PREPARATION' | 'SUBMITTED' | 'APPROVED';
  application_id: string | null;
  application_number: string | null;
  application_status: string | null;
  submitted_at: string | null;
  prerequisites: Array<{
    approval_type_id: string;
    approval_name: string;
    status: string;
    is_satisfied: boolean;
  }>;
  has_unmet_prerequisites: boolean;
  document_checklist: {
    total_required: number;
    mandatory_count: number;
    uploaded_count: number;
    reused_count: number;
    missing_mandatory: string[];
    reused_documents: Array<{
      document_id: string;
      document_type: string;
      file_name: string;
      verification_status: string;
      reuse_count: number;
    }>;
    uploaded_documents: Array<{
      document_id: string;
      document_type: string;
      file_name: string;
      verification_status: string;
      is_reused: boolean;
    }>;
  };
  readiness: {
    is_ready: boolean;
    issues: string[];
    warnings: string[];
    can_submit: boolean;
    blocker_reason?: string;
  };
  service_timeline: {
    default_sla_days: number;
    sla_status?: string | null;
    due_date?: string | null;
    label: string;
  };
  scrutiny_priority?: {
    level: string;
    label: string;
    why: string;
  } | null;
}

export interface ProjectSubmissionCentreData {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    organization: {
      id: string;
      legal_name: string;
      entity_type: string;
    };
  };
  metrics: {
    total_clearances: number;
    ready_to_submit: number;
    blocked_by_prerequisites: number;
    in_preparation: number;
    submitted: number;
    approved: number;
    overall_readiness_percent: number;
  };
  clearances: SubmissionCentreItem[];
}

export interface SubmitApplicationResponse {
  success: boolean;
  application_id: string;
  application_number: string;
  status: string;
  approval_name: string;
  authority: string;
  submitted_at: string;
  message: string;
}

export interface ReusableFieldItem {
  key: string;
  label: string;
  value: string | number;
  source: string;
  verified: boolean;
  category: 'ENTITY' | 'PROPOSAL' | 'LOCATION' | 'TECHNICAL';
}

export interface ProjectProfileData {
  project_id: string;
  entity: {
    id?: string;
    legal_name: string;
    entity_type: string;
    cin: string;
    pan: string;
    gstin: string;
    registered_address: string;
    source: string;
  };
  proposal: {
    name: string;
    type?: string;
    sector: string;
    investment_amount: number;
    employee_count: number;
    stage: string;
    target_start_date?: string | null;
    source: string;
  };
  location: {
    district: string;
    industrial_area: string | null;
    address: string | null;
    state: string;
    source: string;
  };
  technical_attributes: Record<string, string>;
  reusable_fields: ReusableFieldItem[];
}

export interface DepartmentSupplementalField {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'textarea';
  value: string | number;
  unit?: string;
  options?: string[];
  required: boolean;
  help_text?: string;
  source_label: string;
  is_verified_source: boolean;
}

export interface ApplicationFormData {
  application_id: string;
  application_number: string;
  status: string;
  submitted_at: string | null;
  department: {
    id: string;
    name: string;
    code?: string;
  };
  approval_type: {
    id: string;
    name: string;
    authority: string;
    category: string;
  };
  master_profile: ProjectProfileData;
  common_applicant_data: Array<{
    key: string;
    label: string;
    value: string;
    source_label: string;
    verified: boolean;
  }>;
  common_project_data: Array<{
    key: string;
    label: string;
    value: string;
    source_label: string;
    verified: boolean;
  }>;
  location_data: Array<{
    key: string;
    label: string;
    value: string;
    source_label: string;
    verified: boolean;
  }>;
  department_specific_fields: DepartmentSupplementalField[];
  attachments_summary: {
    required_count: number;
    attached_count: number;
    mandatory_missing_count: number;
    all_mandatory_attached: boolean;
    items: Array<{
      document_type: string;
      mandatory: boolean;
      condition?: string;
      attached: boolean;
      document_id?: string;
      file_name?: string;
      status?: string;
    }>;
  };
  prescribed_form: PrescribedForm | null;
  is_locked: boolean;
}

export interface CrossDocumentDiscrepancyItem {
  id: string;
  rule_id: string;
  field_name: string;
  document_a: {
    id: string;
    document_type: string;
    file_name: string;
    extracted_value: string | number;
  };
  document_b: {
    id: string;
    document_type: string;
    file_name: string;
    extracted_value: string | number;
  };
  status: 'PASS' | 'DISCREPANCY' | 'MANUAL_REVIEW';
  difference_summary?: string;
  tolerance_pct?: number;
  difference_pct?: number;
  severity: 'BLOCKING' | 'WARNING' | 'INFO';
  recommended_action: string;
}

export interface CrossDocumentConsistencyResult {
  scope: 'project' | 'application';
  target_id: string;
  total_documents_analyzed: number;
  readable_documents_count: number;
  unreadable_documents_count: number;
  checks_evaluated: number;
  passed_checks: number;
  discrepancies_found: number;
  manual_review_required: number;
  overall_status: 'PASS' | 'DISCREPANCY_DETECTED' | 'MANUAL_REVIEW_REQUIRED';
  can_submit: boolean;
  checks: CrossDocumentDiscrepancyItem[];
  summary_notes: string;
  evaluated_at: string;
}

export interface DocumentGuidanceItem {
  id: string;
  approval_type_id: string;
  approval_name: string;
  document_type: string;
  mandatory: boolean;
  condition?: string | null;

  purpose: string;
  format: string;
  max_size_mb: number;
  issuing_authority: string;
  validity_rule: string;

  prescribed_form?: {
    id: string;
    form_name: string;
    category: string;
    source_label: string;
    download_url: string;
    file_name: string;
  } | null;

  is_attached: boolean;
  attached_document_id?: string;
  attached_file_name?: string;
  attached_status?: string;
  attached_expiry_date?: string | null;
  is_expired?: boolean;
  is_expiring_soon?: boolean;

  vault_reuse: {
    available_in_vault: boolean;
    vault_document_id?: string;
    vault_file_name?: string;
    vault_verification_status?: string;
    vault_expiry_date?: string | null;
    reuse_count: number;
    can_one_click_reuse: boolean;
  };
}

export interface ApplicationDocumentGuidanceResponse {
  application_id: string;
  application_number: string;
  approval_type: {
    id: string;
    name: string;
    authority: string;
    category: string;
    default_sla_days: number;
  };
  metrics: {
    total_requirements: number;
    mandatory_count: number;
    optional_count: number;
    attached_count: number;
    attached_mandatory_count: number;
    missing_mandatory_count: number;
    reusable_from_vault_count: number;
    readiness_percentage: number;
    all_mandatory_satisfied: boolean;
  };
  required_documents: DocumentGuidanceItem[];
  optional_documents: DocumentGuidanceItem[];
  all_documents: DocumentGuidanceItem[];
}

export interface ClearanceDocumentGuidanceGroup {
  approval_id: string;
  approval_name: string;
  authority: string;
  category: string;
  sla_days: number;
  application_id?: string;
  application_status?: string;
  total_requirements: number;
  mandatory_count: number;
  satisfied_count: number;
  completion_rate: number;
  required_documents: DocumentGuidanceItem[];
  optional_documents: DocumentGuidanceItem[];
}

export interface ProjectDocumentGuidanceResponse {
  project_id: string;
  project_name: string;
  total_vault_documents: number;
  verified_vault_documents: number;
  clearances: ClearanceDocumentGuidanceGroup[];
}

export interface ParallelOrchestrationResult {
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
}

export interface ProjectStageStep {
  id: string;
  order: number;
  label: string;
  short_label: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' | 'BLOCKED';
  is_current: boolean;
  completion_pct?: number;
}

export interface ProjectApprovalTrackerItem {
  project_approval_id: string;
  approval_name: string;
  concerned_authority: string;
  category: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: string;
  can_start_now: boolean;
  application_id: string | null;
  application_number: string | null;
  application_status: string | null;
  submitted_at: string | null;
  granted_at: string | null;
  sla_days: number;
  days_elapsed: number;
  days_remaining: number | null;
  sla_status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED' | 'NOT_STARTED';
  missing_prerequisites: string[];
  open_queries_count: number;
  inspections_count: number;
}

export interface ConsolidatedTimelineEvent {
  event_id: string;
  application_id?: string | null;
  application_number?: string | null;
  approval_name?: string | null;
  event_type: string;
  description: string;
  created_at: string;
  actor_name: string;
  actor_role: string;
  stage: string;
}

export interface ProjectApprovalTrackerResponse {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    investment_amount: number;
    employee_count: number;
    created_at: string;
    target_start_date?: string | null;
    organization: {
      id: string;
      legal_name: string;
      entity_type: string;
    };
  };
  summary: {
    total_permissions: number;
    completed: number;
    in_progress: number;
    blocked: number;
    ready_to_start: number;
    overall_completion_pct: number;
  };
  journey_metrics: {
    elapsed_days: number;
    overall_sla_status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
    breached_count: number;
    at_risk_count: number;
    upcoming_action: string;
    upcoming_action_link?: string;
    next_milestone: string;
  };
  stages: ProjectStageStep[];
  approval_items: ProjectApprovalTrackerItem[];
  consolidated_timeline: ConsolidatedTimelineEvent[];
}

export type RenewalCategory = 'ACTION_REQUIRED' | 'DUE_SOON' | 'HEALTHY' | 'OVERDUE';

export interface RenewalDocumentRequirementItem {
  document_type: string;
  mandatory: boolean;
  condition?: string | null;
  available_in_vault: boolean;
  vault_document_id?: string;
  vault_file_name?: string;
  is_verified?: boolean;
  expiry_date?: string | null;
}

export interface RenewalWorkspaceItem {
  id: string;
  project_id: string;
  name: string;
  authority: string;
  frequency: string;
  next_due_date: string;
  days_remaining: number;
  category: RenewalCategory;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  approval_type: {
    id: string;
    name: string;
    authority: string;
    category: string;
    renewal_period_days: number | null;
  } | null;
  source_application: {
    id: string;
    application_number: string;
    status: string;
    granted_at: string | null;
    due_date: string | null;
  } | null;
  required_renewal_documents: RenewalDocumentRequirementItem[];
  reusable_profile_fields: Record<string, string | number>;
  created_at: string;
}

export interface RenewalsWorkspaceResponse {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    organization: {
      id: string;
      legal_name: string;
    } | null;
  };
  summary: {
    total: number;
    action_required: number;
    due_soon: number;
    healthy: number;
    overdue: number;
    completed: number;
  };
  renewals: RenewalWorkspaceItem[];
}

export interface RenewalDetailResponse extends RenewalWorkspaceItem {
  project: {
    id: string;
    name: string;
    sector: string;
    district: string;
    stage: string;
    organization: {
      id: string;
      legal_name: string;
    } | null;
  };
}

export interface PrepareRenewalResponse {
  success: boolean;
  message: string;
  compliance_id: string;
  application_id: string;
  application_number: string;
  project_id: string;
  approval_name: string;
  authority: string;
  attached_documents_count: number;
  target_url: string;
}

// Guidance Assistant (P1.12)
export interface GuidanceAction {
  label: string;
  href: string;
}

export interface GuidanceQuestionAnswer {
  question_id: string;
  question: string;
  category: string;
  title: string;
  answer: string;
  actions: GuidanceAction[];
  suggested_follow_ups?: string[];
}

export interface ContextualGuidancePayload {
  context: {
    page: string;
    project_id: string | null;
    project_name: string | null;
    application_id: string | null;
    application_number: string | null;
    approval_name: string | null;
    authority: string | null;
    status: string | null;
  };
  suggested_questions: Array<{ id: string; question: string; category: string }>;
  answers: Record<string, GuidanceQuestionAnswer>;
  search_match?: GuidanceQuestionAnswer | null;
}

// DigiLocker Verification — Prototype Simulation (P1.X)
export interface DigiLockerCredentialDetail {
  identifier: string;
  label: string;
  value: string;
  status: 'VERIFIED' | 'PENDING';
  issuer: string;
  verified_at?: string;
}

export interface DigiLockerDocumentItem {
  id: string;
  name: string;
  category: 'COMPANY' | 'USER';
  issuer: string;
  certificate_number: string;
  issued_on: string;
  format: string;
  vault_document_type: string;
  is_in_vault: boolean;
  can_reuse_in_caf: boolean;
  reusable_fields: string[];
}

export interface DigiLockerSimulationResult {
  is_connected: boolean;
  simulation: true;
  simulated_at: string;
  project_id: string;
  project_name: string;
  credentials: {
    pan: DigiLockerCredentialDetail;
    organization: DigiLockerCredentialDetail;
    cin: DigiLockerCredentialDetail;
    signatory: DigiLockerCredentialDetail;
  };
  available_documents: {
    company_documents: DigiLockerDocumentItem[];
    user_documents: DigiLockerDocumentItem[];
  };
  linked_vault_documents: Array<{
    id: string;
    document_type: string;
    file_name: string;
    verification_status: string;
  }>;
  reusable_form_fields: Array<{
    field_key: string;
    label: string;
    value: string;
    target_form: string;
  }>;
  data_reuse_summary: {
    master_profile_fields_synced: number;
    vault_documents_verified: number;
    applications_benefited: number;
  };
  disclaimer: string;
}



