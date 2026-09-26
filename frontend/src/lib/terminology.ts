/**
 * Centralized Government Terminology & Role Mapping
 * Governed by:
 * - Maharashtra Industry, Trade and Investment Facilitation Act, 2023
 * - Maharashtra Industry, Trade and Investment Facilitation Rules, 2025
 * - GOVERNMENT_PERSONALIZATION_PROMPT.md & IMPLEMENTATION_PLAN_PERSONALIZED.md
 */

import type { Role } from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  ENTREPRENEUR: 'Applicant / Investor',
  MANAGER: 'Authorized Representative',
  OFFICER: 'Competent Authority Officer',
  NODAL: 'MAITRI Nodal Officer',
  INSPECTOR: 'Designated Inspection Officer',
  ADMIN: 'System Administrator',
};

export interface RoleMeta {
  code: Role;
  label: string;
  scope: string;
  authorityDescription: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  ENTREPRENEUR: {
    code: 'ENTREPRENEUR',
    label: 'Applicant / Investor',
    scope: 'Applicant/Investor Journey',
    authorityDescription:
      'Submits applications for permissions, approvals and registrations through the Single Window System.',
  },
  MANAGER: {
    code: 'MANAGER',
    label: 'Authorized Representative',
    scope: 'Authorized Representative Journey',
    authorityDescription:
      'Person duly authorised to act on behalf of the entrepreneur/investor for submissions and responses.',
  },
  OFFICER: {
    code: 'OFFICER',
    label: 'Competent Authority Officer',
    scope: 'Department Scrutiny & Decision',
    authorityDescription:
      'Conducts scrutiny, seeks additional information through queries, and takes statutory decisions for the concerned Department/Authority.',
  },
  NODAL: {
    code: 'NODAL',
    label: 'MAITRI Nodal Officer',
    scope: 'Nodal Agency Coordination',
    authorityDescription:
      'Nodal Agency officer coordinating between applicants and departments, monitoring processing timelines, and facilitating resolution of delayed applications.',
  },
  INSPECTOR: {
    code: 'INSPECTOR',
    label: 'Designated Inspection Officer',
    scope: 'Site Verification & Reporting',
    authorityDescription:
      'Operational inspection officer assigned to conduct site visits, verify compliance parameters, and record inspection findings.',
  },
  ADMIN: {
    code: 'ADMIN',
    label: 'System Administrator',
    scope: 'Platform & Catalog Configuration',
    authorityDescription:
      'Platform administrator configuring regulatory rules, approval types catalog, specified time limits, and system parameters.',
  },
};

/**
 * Returns formatted role display string with department context where applicable.
 * For Competent Authority Officers: "Competent Authority Officer · Maharashtra Pollution Control Board (MPCB)"
 */
export function formatRole(role?: string | null, departmentName?: string | null): string {
  if (!role) return 'User';
  const baseLabel = ROLE_LABELS[role as Role] || role;

  if (role === 'OFFICER' && departmentName) {
    return `${baseLabel} · ${departmentName}`;
  }

  return baseLabel;
}

/**
 * Official UI Terminology Dictionary
 */
export const TERMS = {
  PROJECT: 'Project / Investment Proposal',
  ORGANIZATION: 'Applicant Entity',
  DEPARTMENT: 'Concerned Department / Authority',
  APPROVAL: 'Permission / Approval',
  APPROVALS_AND_LICENCES: 'Permissions, Approvals & Registrations',
  ROADMAP: 'Permissions & Approvals Roadmap',
  DEPENDENCY_MAP: 'Permissions & Approvals Dependency Map',
  WORK_QUEUE: 'Competent Authority Work Queue',
  OFFICER_ACTIONS: 'Application Processing Actions',
  SCRUTINY_AND_DECISION: 'Scrutiny & Decisions',
  SLA_STATUTORY: 'Specified Time Limit',
  SLA_CONFIGURED: 'Configured Service Timeline',
  COMPLIANCE: 'Compliance & Renewals',
  CATALOGUE: 'Permissions / Approvals Catalogue',
  RULES: 'Applicability & Eligibility Rules',
  APPLICATION_NUMBER: 'Application Reference Number',
  PROTOTYPE_NOTICE: 'Maharashtra Industrial Approvals — Prototype',
  PROTOTYPE_BADGE: 'Prototype Demonstration',
  SIMULATED_INTEGRATION: 'Simulated Integration',
  DEMO_DATA_NOTICE: 'Demonstration / Configurable Data (SIH PS 26130)',
} as const;
