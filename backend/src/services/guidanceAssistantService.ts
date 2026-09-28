import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { getPrescribedFormForApproval } from './prescribedFormService';

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

/**
 * P1.12 — Deterministic Contextual Guidance Assistant Service
 * Gathers active project, application, and regulatory state from the database
 * to provide 100% deterministic, grounded statutory assistance.
 * Zero external LLMs or API keys required.
 */
export async function getContextualGuidance(params: {
  page?: string;
  project_id?: string;
  application_id?: string;
  approval_type_id?: string;
  query_text?: string;
}): Promise<ContextualGuidancePayload> {
  const page = params.page || 'dashboard';

  // 1. Resolve Project
  let project: any = null;
  if (params.project_id) {
    project = await prisma.project.findUnique({
      where: { id: params.project_id },
      include: { organization: true },
    });
  }

  // 2. Resolve Application
  let application: any = null;
  if (params.application_id) {
    application = await prisma.application.findUnique({
      where: { id: params.application_id },
      include: {
        project_approval: {
          include: {
            approval_type: true,
            project: { include: { organization: true } },
          },
        },
        department: true,
        sla_instance: true,
        application_documents: {
          include: { document: true },
        },
        queries: true,
      },
    });

    if (application && !project && application.project_approval?.project) {
      project = application.project_approval.project;
    }
  }

  // Fallback to demo project if no project was specified or found
  if (!project) {
    project = await prisma.project.findUnique({
      where: { id: 'proj-abc-foods-001' },
      include: { organization: true },
    });
  }

  // 3. Resolve Approval Type
  let approvalType: any = null;
  if (application?.project_approval?.approval_type) {
    approvalType = application.project_approval.approval_type;
  } else if (params.approval_type_id) {
    approvalType = await prisma.approvalType.findUnique({
      where: { id: params.approval_type_id },
    });
  }

  // 4. Gather Project State Details
  const projectId = project?.id || 'proj-abc-foods-001';
  const projectName = project?.name || 'Your Investment Proposal';
  const appNumber = application?.application_number || null;
  const appStatus = application?.status || null;
  const approvalName = approvalType?.name || (application ? 'Statutory Clearance' : null);
  const authority = approvalType?.authority || application?.department?.name || 'Competent Authority';

  // Load project approvals, dependencies, vault documents, and open queries
  const [projectApprovals, dependencies, vaultDocs] = await Promise.all([
    prisma.projectApproval.findMany({
      where: { project_id: projectId },
      include: { approval_type: true },
    }),
    prisma.approvalDependency.findMany(),
    prisma.document.findMany({ where: { project_id: projectId } }),
  ]);

  // Load document requirements for active approval type
  let docRequirements: any[] = [];
  if (approvalType) {
    docRequirements = await prisma.documentRequirement.findMany({
      where: { approval_type_id: approvalType.id },
    });
  }

  // Build the 9 canonical deterministic question-answer templates
  const answers: Record<string, GuidanceQuestionAnswer> = {};

  // ── Q1: Why is this permission required? ─────────────────────────────────
  if (approvalType) {
    const paMatch = projectApprovals.find((pa) => pa.approval_type_id === approvalType.id);
    const reason = paMatch?.applicability_reason || `Mandatory statutory requirement under ${approvalType.authority} acts.`;

    answers['why_permission_required'] = {
      question_id: 'why_permission_required',
      question: 'Why is this permission required?',
      category: 'Regulatory Basis',
      title: `Statutory Mandate: ${approvalType.name}`,
      answer: `**${approvalType.name}** is a legally mandated statutory clearance administered by **${approvalType.authority}**.\n\n• **Statutory Objective**: ${approvalType.purpose || approvalType.description || 'Regulatory compliance verification.'}\n• **Trigger Factor**: ${reason}\n• **Statutory Time Limit**: Configured SLA of **${approvalType.default_sla_days} working days** under Maharashtra Right to Public Services Act.`,
      actions: [
        { label: 'View Permission Details', href: '/app/approvals' },
        ...(application ? [{ label: 'Open Application Dossier', href: `/app/applications/${application.id}` }] : []),
      ],
      suggested_follow_ups: ['what_documents_needed', 'what_is_configured_time_limit', 'which_form_should_i_use'],
    };
  } else {
    answers['why_permission_required'] = {
      question_id: 'why_permission_required',
      question: 'Why is this permission required?',
      category: 'Regulatory Basis',
      title: 'Applicability Determination Engine',
      answer: `Under Maharashtra single-window rules, clearances are determined dynamically by matching your project's sector (**${project?.sector || 'Industrial'}**), pollution category, water/power load, and district jurisdiction against statutory applicability rules.`,
      actions: [{ label: 'Review Permissions Roadmap', href: '/app/approvals' }],
      suggested_follow_ups: ['what_should_i_do_next', 'which_approvals_can_start_now'],
    };
  }

  // ── Q2: What documents are needed? ──────────────────────────────────────
  if (approvalType && docRequirements.length > 0) {
    const docLines = docRequirements.map((dr) => {
      const inVault = vaultDocs.find(
        (vd) =>
          vd.document_type.toLowerCase() === dr.document_type.toLowerCase() ||
          vd.file_name.toLowerCase().includes(dr.document_type.toLowerCase().replace(/_/g, ' '))
      );
      const isAttached = application?.application_documents?.some(
        (ad: any) => ad.document?.document_type === dr.document_type
      );

      let statusTag = '⚠️ Missing';
      if (isAttached) statusTag = '✅ Attached';
      else if (inVault) statusTag = '⚡ Ready in Vault (1-click reuse)';

      return `• **${dr.document_type.replace(/_/g, ' ')}** (${dr.mandatory ? 'Mandatory' : 'Optional'}): ${statusTag}`;
    });

    answers['what_documents_needed'] = {
      question_id: 'what_documents_needed',
      question: 'What documents are needed?',
      category: 'Documentation',
      title: `Required Documents for ${approvalType.name}`,
      answer: `The following documents are specified for **${approvalType.name}**:\n\n${docLines.join('\n')}\n\n*All uploaded files must be in PDF format (max 10MB) and undergo automated pre-validation before final submission.*`,
      actions: [
        { label: 'Open Document Vault', href: '/app/documents' },
        ...(application ? [{ label: 'Attach Documents to Application', href: `/app/applications/${application.id}?tab=documents` }] : []),
      ],
      suggested_follow_ups: ['which_form_should_i_use', 'why_application_blocked', 'what_should_i_do_next'],
    };
  } else {
    answers['what_documents_needed'] = {
      question_id: 'what_documents_needed',
      question: 'What documents are needed?',
      category: 'Documentation',
      title: 'Common Document Vault Requirements',
      answer: `Industrial proposals typically require standard corporate proofs:\n\n• **Entity Proof**: Incorporation Certificate, PAN Card, Partnership Deed.\n• **Site Title**: MIDC Allotment Letter, Registered Lease Deed, 7/12 Extract.\n• **Technical Layouts**: Scaled Factory Layout Plan, Machinery Layout, Water Balance Diagram.\n• **Statutory NOCs**: MPCB Consent to Establish, Fire Services Provisional NOC.`,
      actions: [{ label: 'Manage Document Vault', href: '/app/documents' }],
      suggested_follow_ups: ['what_should_i_do_next', 'which_approvals_can_start_now'],
    };
  }

  // ── Q3: Why is this application blocked? ─────────────────────────────────
  const activeApprovalId = approvalType?.id || null;
  const activePrereqs = dependencies
    .filter((d) => d.dependent_approval_type_id === activeApprovalId && d.dependency_type === 'PREREQUISITE')
    .map((d) => {
      const pa = projectApprovals.find((p) => p.approval_type_id === d.prerequisite_approval_type_id);
      return {
        id: d.prerequisite_approval_type_id,
        name: pa?.approval_type?.name || 'Prerequisite Clearance',
        status: pa?.status || 'NOT_STARTED',
        is_completed: pa?.status === 'COMPLETED',
      };
    });

  const missingPrereqs = activePrereqs.filter((p) => !p.is_completed);

  if (missingPrereqs.length > 0) {
    const list = missingPrereqs.map((p) => `• **${p.name}** (Current Status: *${p.status}*)`).join('\n');
    answers['why_application_blocked'] = {
      question_id: 'why_application_blocked',
      question: 'Why is this application blocked?',
      category: 'Dependencies',
      title: 'Prerequisite Approval Dependency Blockers',
      answer: `This application cannot be processed until the following statutory prerequisite clearance(s) are officially granted:\n\n${list}\n\n*Statutory Rule: Downstream applications (such as Factory License) cannot be legally processed before upstream approvals (such as Building Plan Approval or MPCB Consent) are in place.*`,
      actions: [
        { label: 'View Dependency Graph', href: `/app/projects/${projectId}/dependency-graph` },
        { label: 'Check Prerequisites Status', href: '/app/approvals' },
      ],
      suggested_follow_ups: ['which_approvals_can_start_now', 'what_should_i_do_next'],
    };
  } else {
    answers['why_application_blocked'] = {
      question_id: 'why_application_blocked',
      question: 'Why is this application blocked?',
      category: 'Dependencies',
      title: 'No Dependency Blockers Detected',
      answer: `This clearance is **NOT blocked by prerequisites**! All upstream statutory dependencies are satisfied. You may proceed with application preparation, document attachment, and submission.`,
      actions: [
        ...(application ? [{ label: 'Continue Application Form', href: `/app/applications/${application.id}` }] : [{ label: 'Start Application', href: '/app/approvals' }]),
      ],
      suggested_follow_ups: ['what_documents_needed', 'what_should_i_do_next'],
    };
  }

  // ── Q4: What should I do next? ──────────────────────────────────────────
  let nextActionText = '';
  let nextActions: GuidanceAction[] = [];

  if (application) {
    const openQueries = (application.queries || []).filter((q: any) => q.status === 'OPEN');
    const missingMandatory = docRequirements.filter(
      (dr) =>
        dr.mandatory &&
        !application.application_documents?.some((ad: any) => ad.document?.document_type === dr.document_type)
    );

    if (openQueries.length > 0) {
      nextActionText = `⚠️ **Urgent Action**: You have **${openQueries.length} open clarification query** from ${authority}. Respond promptly on the Queries tab to avoid pausing your SLA clock.`;
      nextActions = [{ label: 'Respond to Open Query', href: `/app/applications/${application.id}?tab=queries` }];
    } else if (missingMandatory.length > 0) {
      nextActionText = `📄 **Attach Missing Proofs**: You need to attach **${missingMandatory.length} mandatory documents** before this application can pass pre-submission readiness.`;
      nextActions = [{ label: 'Attach Documents', href: `/app/applications/${application.id}?tab=documents` }];
    } else if (application.status === 'IN_PREPARATION') {
      nextActionText = `✅ **Ready for Review**: All prerequisites and mandatory documents are attached. Inspect your prefilled application and submit it to the Competent Authority.`;
      nextActions = [{ label: 'Review & Submit Form', href: `/app/applications/${application.id}` }];
    } else {
      nextActionText = `⏳ **Application Lodged**: Application **${application.application_number}** is under official departmental review (${application.status}). Track inspection and decision timelines.`;
      nextActions = [{ label: 'Track Approval Status', href: `/app/projects/${projectId}/approval-tracker` }];
    }
  } else {
    nextActionText = `🚀 **Proposal Progress**: Inspect your Project Control Centre to review overall clearance readiness, start eligible parallel applications, and verify required documents in the Vault.`;
    nextActions = [
      { label: 'Project Control Centre', href: `/app/projects/${projectId}` },
      { label: 'Approval Tracker & SLA Timeline', href: `/app/projects/${projectId}/approval-tracker` },
    ];
  }

  answers['what_should_i_do_next'] = {
    question_id: 'what_should_i_do_next',
    question: 'What should I do next?',
    category: 'Next Best Action',
    title: 'Recommended Next Action',
    answer: nextActionText,
    actions: nextActions,
    suggested_follow_ups: ['which_approvals_can_start_now', 'what_documents_needed', 'what_is_configured_time_limit'],
  };

  // ── Q5: Which approvals can start now? ───────────────────────────────────
  // Find project approvals whose prerequisites are all completed
  const eligibleToStart = projectApprovals.filter((pa) => {
    if (pa.status === 'COMPLETED' || pa.status === 'IN_PROGRESS') return false;
    const prereqs = dependencies.filter(
      (d) => d.dependent_approval_type_id === pa.approval_type_id && d.dependency_type === 'PREREQUISITE'
    );
    return prereqs.every((pr) => {
      const upstream = projectApprovals.find((p) => p.approval_type_id === pr.prerequisite_approval_type_id);
      return upstream?.status === 'COMPLETED';
    });
  });

  if (eligibleToStart.length > 0) {
    const list = eligibleToStart.map((pa) => `• **${pa.approval_type.name}** (${pa.approval_type.authority})`).join('\n');
    answers['which_approvals_can_start_now'] = {
      question_id: 'which_approvals_can_start_now',
      question: 'Which approvals can start now?',
      category: 'Parallel Processing',
      title: 'Eligible Clearances Ready to Start',
      answer: `The following **${eligibleToStart.length} clearance(s)** have all prerequisite dependencies satisfied and can proceed in parallel right now:\n\n${list}\n\n*You can use the 'Start Eligible Applications' button on the Permissions page to safely initialize these workflows in one click without duplicate submissions.*`,
      actions: [
        { label: 'Start Eligible Applications', href: '/app/approvals' },
        { label: 'View Project Submission Centre', href: `/app/projects/${projectId}/submission-centre` },
      ],
      suggested_follow_ups: ['what_should_i_do_next', 'why_application_blocked'],
    };
  } else {
    answers['which_approvals_can_start_now'] = {
      question_id: 'which_approvals_can_start_now',
      question: 'Which approvals can start now?',
      category: 'Parallel Processing',
      title: 'Parallel Clearance Eligibility',
      answer: `All eligible clearances without dependencies have already been initiated or completed! Any remaining clearances require awaiting prerequisite clearance decisions before they can be unlocked.`,
      actions: [
        { label: 'Track Approvals Timeline', href: `/app/projects/${projectId}/approval-tracker` },
      ],
      suggested_follow_ups: ['what_should_i_do_next', 'what_is_configured_time_limit'],
    };
  }

  // ── Q6: Which document failed validation? ────────────────────────────────
  const invalidDocs = (application?.application_documents || []).filter(
    (ad: any) => ad.validation_status === 'INVALID' || ad.validation_status === 'REJECTED'
  );

  if (invalidDocs.length > 0) {
    const list = invalidDocs
      .map((ad: any) => `• **${ad.document?.file_name || 'Document'}**: ${ad.validation_notes || 'Failed integrity check'}`)
      .join('\n');

    answers['which_document_failed_validation'] = {
      question_id: 'which_document_failed_validation',
      question: 'Which document failed validation?',
      category: 'Validation Diagnostics',
      title: 'Document Validation Failures',
      answer: `The following attached document(s) have failed automated validation checks:\n\n${list}\n\nPlease replace these documents in your Document Vault before submitting.`,
      actions: [
        { label: 'Replace in Document Vault', href: '/app/documents' },
        ...(application ? [{ label: 'Application Documents Tab', href: `/app/applications/${application.id}?tab=documents` }] : []),
      ],
      suggested_follow_ups: ['what_documents_needed', 'what_should_i_do_next'],
    };
  } else {
    answers['which_document_failed_validation'] = {
      question_id: 'which_document_failed_validation',
      question: 'Which document failed validation?',
      category: 'Validation Diagnostics',
      title: 'Zero Document Validation Failures',
      answer: `**All validated documents are in good standing!** No expired certificates, format discrepancies, or integrity check failures were detected across your attached proofs.`,
      actions: [
        { label: 'View Document Vault', href: '/app/documents' },
      ],
      suggested_follow_ups: ['what_documents_needed', 'what_should_i_do_next'],
    };
  }

  // ── Q7: Which form should I use? ─────────────────────────────────────────
  if (approvalType) {
    const prescribedForm = await getPrescribedFormForApproval(approvalType.id);

    if (prescribedForm) {
      answers['which_form_should_i_use'] = {
        question_id: 'which_form_should_i_use',
        question: 'Which form should I use?',
        category: 'Prescribed Templates',
        title: `Official Application Format: ${prescribedForm.form_name}`,
        answer: `Use the verified statutory format **${prescribedForm.form_name}** prescribed by **${prescribedForm.authority}**.\n\n• **Provenance**: Grounded in official government sources (${prescribedForm.source_label}).\n• **Format Type**: ${prescribedForm.format_type === 'OFFICIAL_PDF' ? 'Official Prescribed PDF Template' : 'Online Statutory Application Portal'}\n• **Status**: ${prescribedForm.provenance_status}`,
        actions: [
          ...(prescribedForm.download_url ? [{ label: 'Download Official Form PDF', href: prescribedForm.download_url }] : []),
          ...(prescribedForm.official_source_url ? [{ label: 'Open Official Authority Portal', href: prescribedForm.official_source_url }] : []),
        ],
        suggested_follow_ups: ['what_documents_needed', 'why_permission_required'],
      };
    } else {
      answers['which_form_should_i_use'] = {
        question_id: 'which_form_should_i_use',
        question: 'Which form should I use?',
        category: 'Prescribed Templates',
        title: 'Single Window Common Application Form',
        answer: `This approval clearance utilizes the integrated **Common Application Form (CAF)**. Master enterprise parameters from your Project Profile are pre-populated automatically, requiring only clearance-specific operational parameters.`,
        actions: [
          ...(application ? [{ label: 'Fill Application Form', href: `/app/applications/${application.id}` }] : [{ label: 'View Approvals', href: '/app/approvals' }]),
        ],
        suggested_follow_ups: ['what_documents_needed', 'what_should_i_do_next'],
      };
    }
  } else {
    answers['which_form_should_i_use'] = {
      question_id: 'which_form_should_i_use',
      question: 'Which form should I use?',
      category: 'Prescribed Templates',
      title: 'Prescribed Forms & Application Formats',
      answer: `MAITRI Single Window supports verified statutory forms (such as MPCB Combined Consent Form, DISH Factory License Form 2, and FSSAI Form B) alongside the unified digital Common Application Form.`,
      actions: [{ label: 'Browse Approval Directory', href: '/app/approval-directory' }],
      suggested_follow_ups: ['what_documents_needed', 'which_approvals_can_start_now'],
    };
  }

  // ── Q8: What is the configured time limit? ──────────────────────────────
  const defaultSlaDays = approvalType?.default_sla_days || 30;
  const slaInstance = application?.sla_instance || null;

  let slaExplanation = `Under the **Maharashtra Right to Public Services Act (RTS)**:\n\n• **Statutory Timeline**: **${defaultSlaDays} working days** from official submission.\n• **Clock Start**: Triggered on formal departmental submission.\n• **Query Clock Suspension**: If an officer raises a clarification query, the statutory countdown stops until the applicant responds.\n• **Deemed Approval / Escalation**: Unresolved applications breaching the timeline are escalated to the Empowered Committee under the District Collector.`;

  if (slaInstance) {
    slaExplanation += `\n\n**Current Application SLA Status**:\n• Status: **${slaInstance.status}**\n• Elapsed: **${slaInstance.elapsed_days || 0} days**\n• Days Remaining: **${slaInstance.days_remaining ?? 'N/A'} days**`;
  }

  answers['what_is_configured_time_limit'] = {
    question_id: 'what_is_configured_time_limit',
    question: 'What is the configured time limit?',
    category: 'SLA & Timelines',
    title: `Statutory Time Limit (${defaultSlaDays} Days)`,
    answer: slaExplanation,
    actions: [
      { label: 'View Approval Tracker & SLA Countdown', href: `/app/projects/${projectId}/approval-tracker` },
      ...(application ? [{ label: 'View Application Timeline', href: `/app/applications/${application.id}?tab=timeline` }] : []),
    ],
    suggested_follow_ups: ['what_should_i_do_next', 'how_do_i_respond_to_query'],
  };

  // ── Q9: How do I respond to this query? ─────────────────────────────────
  const openQueries = (application?.queries || []).filter((q: any) => q.status === 'OPEN');

  if (openQueries.length > 0) {
    const queryList = openQueries
      .map((q: any) => `• **Query #${q.id.slice(-6)}**: "${q.subject}" — ${q.description}`)
      .join('\n');

    answers['how_do_i_respond_to_query'] = {
      question_id: 'how_do_i_respond_to_query',
      question: 'How do I respond to this query?',
      category: 'Clarifications',
      title: `Responding to Departmental Queries (${openQueries.length} Open)`,
      answer: `The reviewing officer has requested clarification:\n\n${queryList}\n\n**Steps to Respond**:\n1. Click **View Open Query** below.\n2. Review the technical defect or document requested.\n3. Type your clarification response and attach supporting proofs from the Document Vault.\n4. Click **Submit Response**. The reviewing officer will be notified and the SLA clock will resume.`,
      actions: [
        { label: 'View Open Query & Submit Response', href: `/app/applications/${application.id}?tab=queries` },
      ],
      suggested_follow_ups: ['what_is_configured_time_limit', 'what_should_i_do_next'],
    };
  } else {
    answers['how_do_i_respond_to_query'] = {
      question_id: 'how_do_i_respond_to_query',
      question: 'How do I respond to this query?',
      category: 'Clarifications',
      title: 'Query Response Procedure',
      answer: `There are currently **zero open queries** on this file! If a Competent Authority officer raises a clarification in the future, you will receive an instant notification alert, and a dedicated response box will unlock on your application workspace.`,
      actions: [
        ...(application ? [{ label: 'Queries Tab', href: `/app/applications/${application.id}?tab=queries` }] : [{ label: 'Investor Assistance', href: '/app/assistance' }]),
      ],
      suggested_follow_ups: ['what_should_i_do_next', 'what_is_configured_time_limit'],
    };
  }

  // 5. Build Suggested Questions list tailored to active page
  let suggestedQuestionIds: string[] = [];

  if (page.includes('application') || application) {
    suggestedQuestionIds = [
      'why_permission_required',
      'what_documents_needed',
      'why_application_blocked',
      'what_should_i_do_next',
      'which_form_should_i_use',
      'what_is_configured_time_limit',
      'how_do_i_respond_to_query',
    ];
  } else if (page.includes('tracker') || page.includes('timeline')) {
    suggestedQuestionIds = [
      'what_should_i_do_next',
      'which_approvals_can_start_now',
      'why_application_blocked',
      'what_is_configured_time_limit',
      'why_permission_required',
    ];
  } else if (page.includes('document')) {
    suggestedQuestionIds = [
      'which_document_failed_validation',
      'what_documents_needed',
      'what_should_i_do_next',
      'which_form_should_i_use',
    ];
  } else if (page.includes('directory') || page.includes('wizard')) {
    suggestedQuestionIds = [
      'why_permission_required',
      'which_approvals_can_start_now',
      'which_form_should_i_use',
      'what_is_configured_time_limit',
      'what_should_i_do_next',
    ];
  } else {
    // Default dashboard
    suggestedQuestionIds = [
      'what_should_i_do_next',
      'which_approvals_can_start_now',
      'what_documents_needed',
      'what_is_configured_time_limit',
      'why_permission_required',
    ];
  }

  const suggestedQuestions = suggestedQuestionIds
    .map((qid) => answers[qid])
    .filter(Boolean)
    .map((ans) => ({
      id: ans.question_id,
      question: ans.question,
      category: ans.category,
    }));

  // 6. Free-form query keyword / intention matching
  let searchMatch: GuidanceQuestionAnswer | null = null;
  if (params.query_text) {
    const q = params.query_text.toLowerCase().trim();

    if (q.includes('block') || q.includes('prereq') || q.includes('wait') || q.includes('depend')) {
      searchMatch = answers['why_application_blocked'];
    } else if (q.includes('doc') || q.includes('upload') || q.includes('proof') || q.includes('attach')) {
      searchMatch = answers['what_documents_needed'];
    } else if (q.includes('why') || q.includes('reason') || q.includes('basis') || q.includes('mandate')) {
      searchMatch = answers['why_permission_required'];
    } else if (q.includes('next') || q.includes('action') || q.includes('todo') || q.includes('now')) {
      searchMatch = answers['what_should_i_do_next'];
    } else if (q.includes('start') || q.includes('parallel') || q.includes('eligible')) {
      searchMatch = answers['which_approvals_can_start_now'];
    } else if (q.includes('fail') || q.includes('invalid') || q.includes('reject') || q.includes('error')) {
      searchMatch = answers['which_document_failed_validation'];
    } else if (q.includes('form') || q.includes('template') || q.includes('download') || q.includes('pdf')) {
      searchMatch = answers['which_form_should_i_use'];
    } else if (q.includes('sla') || q.includes('time') || q.includes('limit') || q.includes('deadline') || q.includes('day')) {
      searchMatch = answers['what_is_configured_time_limit'];
    } else if (q.includes('query') || q.includes('clarif') || q.includes('respond') || q.includes('officer')) {
      searchMatch = answers['how_do_i_respond_to_query'];
    } else {
      // Default fallback
      searchMatch = answers['what_should_i_do_next'] || answers['why_permission_required'];
    }
  }

  return {
    context: {
      page,
      project_id: projectId,
      project_name: projectName,
      application_id: application?.id || null,
      application_number: appNumber,
      approval_name: approvalName,
      authority,
      status: appStatus,
    },
    suggested_questions: suggestedQuestions,
    answers,
    search_match: searchMatch,
  };
}
