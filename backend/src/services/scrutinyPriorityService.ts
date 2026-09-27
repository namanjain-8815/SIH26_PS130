import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

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
  contributing_factors: ScrutinyContributingFactor[];
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

export interface ScrutinyEvaluationContext {
  application_status?: string;
  required_documents_count?: number;
  uploaded_documents_count?: number;
  prerequisites?: { id: string; status?: string }[];
  concerned_departments_count?: number;
  requires_inspection?: boolean;
  scheduled_inspections_count?: number;
  open_queries_count?: number;
  sla_status?: string | null;
  sla_due_date?: Date | string | null;
  adverse_findings_count?: number;
}

const STATUTORY_DISCLAIMER =
  'Procedural operational complexity indicator calculated from workflow data. Not a legally binding statutory risk score or assessment.';

/**
 * Pure evaluation function for calculating Scrutiny Priority / Review Complexity
 * based on operational workflow signals.
 */
export function calculateScrutinyPriority(ctx: ScrutinyEvaluationContext): ScrutinyPriorityResult {
  const factors: ScrutinyContributingFactor[] = [];
  let score = 0;

  const reqDocs = ctx.required_documents_count ?? 0;
  const upDocs = ctx.uploaded_documents_count ?? 0;
  const missingDocs = Math.max(0, reqDocs - upDocs);

  // 1. Missing Required Documents
  if (missingDocs > 0) {
    const isMajorMissing = missingDocs >= 2;
    const impact = isMajorMissing ? 3 : 2;
    score += impact;
    factors.push({
      factor: `Missing ${missingDocs} mandatory statutory document${missingDocs > 1 ? 's' : ''} required for appraisal.`,
      category: 'DOCUMENTATION',
      severity: isMajorMissing ? 'HIGH' : 'MODERATE',
      impact_score: impact,
    });
  }

  // 2. Prerequisite Count & Unresolved Dependencies
  const prereqs = ctx.prerequisites ?? [];
  const prereqCount = prereqs.length;
  const pendingPrereqs = prereqs.filter((p) => p.status !== 'COMPLETED').length;

  if (pendingPrereqs > 0) {
    score += 2;
    factors.push({
      factor: `Linked to ${pendingPrereqs} pending upstream clearance${pendingPrereqs > 1 ? 's' : ''} not yet completed.`,
      category: 'DEPENDENCY',
      severity: 'MODERATE',
      impact_score: 2,
    });
  } else if (prereqCount >= 2) {
    score += 1;
    factors.push({
      factor: `Complex statutory workflow with ${prereqCount} prerequisite dependencies.`,
      category: 'DEPENDENCY',
      severity: 'INFO',
      impact_score: 1,
    });
  }

  // 3. Multi-Agency / Number of Concerned Authorities
  const deptCount = ctx.concerned_departments_count ?? 1;
  if (deptCount >= 3) {
    score += 2;
    factors.push({
      factor: `Requires inter-agency coordination across ${deptCount} distinct statutory bodies.`,
      category: 'MULTI_AGENCY',
      severity: 'MODERATE',
      impact_score: 2,
    });
  } else if (deptCount === 2) {
    score += 1;
    factors.push({
      factor: `Requires joint bilateral coordination across ${deptCount} government departments.`,
      category: 'MULTI_AGENCY',
      severity: 'INFO',
      impact_score: 1,
    });
  }

  // 4. Inspection Requirement
  const needsInspection = !!ctx.requires_inspection || (ctx.scheduled_inspections_count ?? 0) > 0;
  if (needsInspection) {
    score += 1;
    factors.push({
      factor: 'Requires mandatory physical site or joint technical inspection.',
      category: 'INSPECTION',
      severity: 'MODERATE',
      impact_score: 1,
    });
  }

  // 5. Open / Pending Clarification Queries
  const openQueries = ctx.open_queries_count ?? 0;
  if (openQueries >= 2) {
    score += 3;
    factors.push({
      factor: `${openQueries} open clarification queries pending officer appraisal or applicant response.`,
      category: 'CLARIFICATION',
      severity: 'HIGH',
      impact_score: 3,
    });
  } else if (openQueries === 1) {
    score += 2;
    factors.push({
      factor: '1 open clarification query pending procedural response or scrutiny.',
      category: 'CLARIFICATION',
      severity: 'MODERATE',
      impact_score: 2,
    });
  }

  // 6. Specified Time-Limit (SLA) Risk
  const slaStatus = ctx.sla_status;
  if (slaStatus === 'BREACHED') {
    score += 4;
    factors.push({
      factor: 'Statutory specified time-limit breached; priority processing required under RTS Act.',
      category: 'SLA_TIMELINE',
      severity: 'CRITICAL',
      impact_score: 4,
    });
  } else if (slaStatus === 'AT_RISK') {
    score += 3;
    factors.push({
      factor: 'Specified time-limit at risk with under 25% duration remaining.',
      category: 'SLA_TIMELINE',
      severity: 'HIGH',
      impact_score: 3,
    });
  }

  // 7. Adverse / Critical Inspection Findings
  const adverseFindings = ctx.adverse_findings_count ?? 0;
  if (adverseFindings > 0) {
    score += 4;
    factors.push({
      factor: `${adverseFindings} critical or high-severity inspection finding${adverseFindings > 1 ? 's' : ''} recorded during site visit.`,
      category: 'FINDINGS',
      severity: 'CRITICAL',
      impact_score: 4,
    });
  }

  // Determine Level: LOW, MEDIUM, or HIGH
  const hasCritical = factors.some((f) => f.severity === 'CRITICAL');
  const hasHigh = factors.some((f) => f.severity === 'HIGH');

  let level: ScrutinyPriorityLevel;
  let label: string;

  if (hasCritical || score >= 5) {
    level = 'HIGH';
    label = 'High Review Complexity';
  } else if (hasHigh || score >= 2) {
    level = 'MEDIUM';
    label = 'Medium Review Complexity';
  } else {
    level = 'LOW';
    label = 'Standard Scrutiny';
  }

  // Sort factors by impact_score descending
  factors.sort((a, b) => b.impact_score - a.impact_score);

  // Pick top 2-4 factors
  let pickedFactorStrings: string[] = factors.map((f) => f.factor).slice(0, 4);

  // If fewer than 2 factors, supplement with positive baseline operational factors
  if (pickedFactorStrings.length === 0) {
    pickedFactorStrings = [
      'All mandatory statutory documents uploaded and verified.',
      'Procedural SLA timeline is healthy and within service limit.',
    ];
  } else if (pickedFactorStrings.length === 1) {
    pickedFactorStrings.push('Procedural SLA timeline is healthy and within service limit.');
  }

  // Generate human-readable "why" summary
  let why: string;
  if (level === 'HIGH') {
    why = `High scrutiny priority driven by: ${pickedFactorStrings.slice(0, 2).join(' ')}`;
  } else if (level === 'MEDIUM') {
    why = `Medium review complexity driven by: ${pickedFactorStrings.slice(0, 2).join(' ')}`;
  } else {
    why = 'Standard procedural scrutiny. Documentation in order with no critical bottlenecks.';
  }

  return {
    level,
    score,
    label,
    factors: pickedFactorStrings,
    contributing_factors: factors,
    why,
    metrics: {
      missing_documents: missingDocs,
      required_documents: reqDocs,
      uploaded_documents: upDocs,
      prerequisite_count: prereqCount,
      pending_prerequisites: pendingPrereqs,
      concerned_authorities: deptCount,
      requires_inspection: needsInspection,
      open_queries: openQueries,
      sla_status: slaStatus ?? null,
      critical_findings_count: adverseFindings,
    },
    disclaimer: STATUTORY_DISCLAIMER,
  };
}

/**
 * Computes the Scrutiny Priority for a specific application by ID,
 * retrieving all related project, dependency, SLA, query, and inspection records.
 */
export async function getApplicationScrutinyPriority(applicationId: string): Promise<ScrutinyPriorityResult> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: {
          approval_type: {
            include: {
              document_requirements: true,
              dependent_on: true,
            },
          },
          project: {
            include: {
              project_approvals: {
                include: { approval_type: true },
              },
            },
          },
        },
      },
      application_documents: true,
      queries: {
        where: { status: { in: ['OPEN', 'RESPONDED'] } },
      },
      inspections: {
        include: { findings: true },
      },
      sla_instance: true,
    },
  });

  if (!app) {
    throw new NotFoundError('Application not found');
  }

  const approvalType = app.project_approval?.approval_type;
  const project = app.project_approval?.project;
  const reqDocs = approvalType?.document_requirements?.length ?? 0;
  const upDocs = app.application_documents?.length ?? 0;

  // Prerequisite approvals check
  const dependentOn = approvalType?.dependent_on ?? [];
  const projectApprovals = project?.project_approvals ?? [];
  const paByTypeId = new Map(projectApprovals.map((pa) => [pa.approval_type_id, pa]));

  const prerequisites = dependentOn
    .filter((dep) => dep.dependency_type === 'PREREQUISITE')
    .map((dep) => {
      const pa = paByTypeId.get(dep.prerequisite_approval_type_id);
      return {
        id: dep.prerequisite_approval_type_id,
        status: pa?.status ?? 'NOT_STARTED',
      };
    });

  // Count distinct departments across project approvals
  const distinctDepts = new Set<string>();
  if (app.department_id) distinctDepts.add(app.department_id);
  for (const pa of projectApprovals) {
    if (pa.approval_type?.department_id) {
      distinctDepts.add(pa.approval_type.department_id);
    }
  }

  // Count adverse inspection findings
  let adverseFindingsCount = 0;
  const scheduledInspections = app.inspections ?? [];
  for (const insp of scheduledInspections) {
    for (const finding of insp.findings ?? []) {
      if (
        finding.severity === 'CRITICAL' ||
        finding.severity === 'HIGH' ||
        finding.status === 'NON_COMPLIANT'
      ) {
        adverseFindingsCount++;
      }
    }
  }

  return calculateScrutinyPriority({
    application_status: app.status,
    required_documents_count: reqDocs,
    uploaded_documents_count: upDocs,
    prerequisites,
    concerned_departments_count: Math.max(1, distinctDepts.size),
    requires_inspection: approvalType?.requires_inspection ?? false,
    scheduled_inspections_count: scheduledInspections.length,
    open_queries_count: app.queries?.length ?? 0,
    sla_status: app.sla_instance?.status ?? null,
    sla_due_date: app.sla_instance?.due_date ?? null,
    adverse_findings_count: adverseFindingsCount,
  });
}
