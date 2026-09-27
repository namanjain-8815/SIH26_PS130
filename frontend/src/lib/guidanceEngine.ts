/**
 * Contextual Application Guidance Assistant Engine
 * 
 * Deterministic, rule-driven statutory and workflow guidance for applicants.
 * Operates without external LLM or cloud API keys.
 * 
 * Future Seam: Provides GuidanceLLMProviderSeam interface for optional
 * integration with Bhashini or external language models.
 */

export interface GuidanceAction {
  label: string;
  href: string;
}

export interface GuidanceResponse {
  intentId: string;
  title: string;
  answer: string;
  actions?: GuidanceAction[];
  suggestedFollowUps?: string[];
}

export interface GuidanceContext {
  pathname: string;
  projectId?: string;
  applicationId?: string;
  activeTab?: string;
  projectData?: {
    name?: string;
    sector?: string;
    stage?: string;
    investment_amount?: number;
    district?: string;
  };
  applicationData?: {
    application_number?: string;
    approval_name?: string;
    authority?: string;
    status?: string;
    open_queries_count?: number;
    sla_status?: string;
    sla_due_date?: string;
    missing_docs_count?: number;
  };
}

/**
 * Extension Seam: Optional future external LLM / language service provider.
 * When enabled, the assistant can fall back to this seam for natural language translation.
 */
export interface GuidanceLLMProviderSeam {
  enabled: boolean;
  providerName: 'rule_based_deterministic' | 'bhashini_indic_llm' | 'external_statutory_llm';
  translateQuery?(text: string, targetLanguage: string): Promise<string>;
  generateSynthesizedAnswer?(context: GuidanceContext, prompt: string): Promise<string>;
}

export const CURRENT_GUIDANCE_PROVIDER: GuidanceLLMProviderSeam = {
  enabled: false,
  providerName: 'rule_based_deterministic',
};

/**
 * Returns tailored prompt pills based on current pathname and context.
 */
export function getSuggestedPromptsForContext(ctx: GuidanceContext): string[] {
  const path = ctx.pathname || '';

  if (path.includes('/app/applications/')) {
    const prompts = [
      'What is this permission?',
      'Why is this required?',
      'Which documents are required?',
      'Why is my application not ready?',
      'When is the statutory timeline due?',
    ];
    if (ctx.applicationData?.open_queries_count && ctx.applicationData.open_queries_count > 0) {
      prompts.unshift('How can I respond to open queries?');
    }
    return prompts;
  }

  if (path.includes('/app/approvals')) {
    return [
      'Which permissions can I start now?',
      'What are prerequisites and dependencies?',
      'How does parallel orchestration work?',
      'Why is a clearance marked blocked?',
      'What is the next best action?',
    ];
  }

  if (path.includes('/app/documents')) {
    return [
      'Which documents are currently missing?',
      'What file formats and size limits are accepted?',
      'How does document pre-validation work?',
      'How do I reuse documents across permissions?',
      'What happens if a certificate is expired?',
    ];
  }

  if (path.includes('/app/compliance')) {
    return [
      'How are compliance obligations calculated?',
      'When is my next statutory renewal due?',
      'How do I record a completed compliance task?',
      'Which authorities enforce periodic compliance?',
    ];
  }

  if (path.includes('/app/projects/new')) {
    return [
      'What information is required to register a proposal?',
      'How does the regulatory engine determine permissions?',
      'Can I update proposal attributes later?',
      'What happens after completing the wizard?',
    ];
  }

  if (path.includes('/app/assistance')) {
    return [
      'What is Investor Assistance & Facilitation?',
      'How does a MAITRI Nodal Officer assist me?',
      'What is the difference between assistance and a grievance?',
      'How long does facilitation desk review take?',
    ];
  }

  if (path.includes('/submission-centre')) {
    return [
      'What is the Project Submission Centre?',
      'Why are some clearances blocked from submission?',
      'How does document pre-validation prevent rejection?',
      'What happens after I click Review & Submit?',
      'Can permissions be submitted in parallel?',
    ];
  }

  // Default dashboard / general context
  return [
    'What should I do next?',
    'Which permissions can I start now?',
    'Why is my overall proposal readiness low?',
    'When are my nearest SLA deadlines?',
    'How do I request investor assistance?',
  ];
}

/**
 * Resolves user query or prompt into a rich, deterministic guidance response.
 */
export function resolveGuidanceQuestion(query: string, ctx: GuidanceContext): GuidanceResponse {
  const q = query.toLowerCase().trim();
  const projName = ctx.projectData?.name || 'your investment proposal';
  const approvalName = ctx.applicationData?.approval_name || 'this statutory clearance';
  const appNumber = ctx.applicationData?.application_number;
  const authority = ctx.applicationData?.authority || 'the Competent Authority';
  const status = ctx.applicationData?.status || 'IN_PREPARATION';

  // 1. What is this permission?
  if (q.includes('what is this permission') || q.includes('about this permission') || q.includes('what does this approval mean')) {
    return {
      intentId: 'what_is_permission',
      title: `Understanding ${approvalName}`,
      answer: `**${approvalName}** is a statutory approval granted by **${authority}**.\n\nUnder Maharashtra single-window regulations, this permission authorizes your industrial undertaking to proceed with specific site establishment, utility connection, or operational activities in accordance with state statutory acts.`,
      actions: [
        { label: 'View Permission Details', href: `/app/approvals` },
        { label: 'Check Required Documents', href: `${ctx.pathname}?tab=documents` },
      ],
      suggestedFollowUps: ['Why is this required?', 'Which documents are required?', 'When is the statutory timeline due?'],
    };
  }

  // 2. Why is this required?
  if (q.includes('why is this required') || q.includes('why required') || q.includes('statutory reason') || q.includes('basis of requirement')) {
    return {
      intentId: 'why_required',
      title: `Statutory Basis for ${approvalName}`,
      answer: `This approval applies to **${projName}** based on your declared industrial proposal attributes:\n\n• **Sector & Scale**: Classified under scheduled industrial operations requiring statutory clearance.\n• **Jurisdiction**: Falls under ${ctx.projectData?.district || 'district'} industrial development authority jurisdiction.\n• **Environmental & Safety Standards**: Applicable state pollution and municipal safety regulations mandate obtaining this prior to site development.`,
      actions: [
        { label: 'Review Regulatory Attributes', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
        { label: 'View Statutory Roadmap', href: `/app/approvals` },
      ],
      suggestedFollowUps: ['Which documents are required?', 'Which permissions can I start now?'],
    };
  }

  // 3. Which documents are required / missing?
  if (q.includes('which document') || q.includes('required document') || q.includes('missing document') || q.includes('what documents')) {
    return {
      intentId: 'required_documents',
      title: 'Documentation & Vault Pre-Validation Requirements',
      answer: `Statutory permissions require certified proofs uploaded via your **Document Vault**:\n\n1. **Corporate Identity Proof**: Company PAN Card / Incorporation Certificate.\n2. **Premises Allotment / Title**: Registered Lease Agreement or MIDC Allotment Letter.\n3. **Engineering Drawings**: Scaled Architectural & Machine Layout Plans.\n4. **Statutory Pre-requisite Clearances**: Consent to Establish (MPCB) or Fire Safety NOC where applicable.\n\n*All uploaded files undergo automated pre-validation to detect format errors, expired certificates, and document type mismatches before submission.*`,
      actions: [
        { label: 'Open Document Vault', href: '/app/documents' },
        { label: 'View Application Documents', href: `${ctx.pathname}?tab=documents` },
      ],
      suggestedFollowUps: ['How does document pre-validation work?', 'Why is my application not ready?'],
    };
  }

  // 4. Why is my application not ready?
  if (q.includes('not ready') || q.includes('why not ready') || q.includes('readiness check') || q.includes('readiness fail')) {
    return {
      intentId: 'why_not_ready',
      title: 'Pre-Submission Readiness Blocker Analysis',
      answer: `Applications remain in **NOT READY** state until all 3 automated criteria pass:\n\n• **Mandatory Documents Attached**: Every required document type must be linked from your Document Vault.\n• **Validity & Integrity**: Attached certificates must have a status of VERIFIED or passed pre-validation without expiration.\n• **No Open Blockers**: No unaddressed departmental queries or incomplete prerequisite clearances.\n\nYou can run an automated diagnostic check anytime on the **Readiness Check** tab.`,
      actions: [
        { label: 'Run Readiness Check', href: `${ctx.pathname}?tab=readiness` },
        { label: 'Attach Missing Documents', href: `${ctx.pathname}?tab=documents` },
      ],
      suggestedFollowUps: ['Which documents are required?', 'What happens after submission?'],
    };
  }

  // 5. What should I do next?
  if (q.includes('what should i do next') || q.includes('next action') || q.includes('next step') || q.includes('what next')) {
    return {
      intentId: 'what_next',
      title: 'Next Best Statutory Action',
      answer: `Based on current Single Window workflow state for **${projName}**:\n\n1. **Complete Eligible Clearances**: Permissions marked with green **Can Proceed in Parallel** can be started immediately.\n2. **Resolve Open Queries**: If authorities have requested clarifications, responding promptly avoids SLA clock suspension.\n3. **Attach Vault Documents**: Use the Document Vault to reuse verified land titles and company PAN cards.\n4. **Run Pre-Submission Check**: Verify readiness before final review and departmental submission.`,
      actions: [
        { label: 'View Project Control Centre', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
        { label: 'Start Eligible Clearances', href: '/app/approvals' },
      ],
      suggestedFollowUps: ['Which permissions can I start now?', 'How can I respond to open queries?'],
    };
  }

  // 6. Which permissions can I start now / parallel?
  if (q.includes('start now') || q.includes('parallel') || q.includes('can i start') || q.includes('eligible clearance')) {
    return {
      intentId: 'parallel_approvals',
      title: 'Parallel Processing & Eligible Applications',
      answer: `Single Window coordinates parallel processing under Maharashtra statutory timelines:\n\n• Permissions without prior dependencies (e.g. **MIDC Water Connection**, **MPCB Consent to Establish**) can be prepared concurrently.\n• Approvals that require prior legal clearance (e.g. Factory License requires approved Building Plan) will remain blocked until prerequisite approvals are issued.\n• Use the **Start Eligible Applications** action on the Permissions page to safely initialize all eligible workspaces at once without duplicate entries.`,
      actions: [
        { label: 'Start Eligible Applications', href: '/app/approvals' },
        { label: 'View Dependency Graph', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
      ],
      suggestedFollowUps: ['What are prerequisites and dependencies?', 'What should I do next?'],
    };
  }

  // 7. How can I respond to queries?
  if (q.includes('query') || q.includes('respond to query') || q.includes('clarification') || q.includes('officer query')) {
    return {
      intentId: 'respond_query',
      title: 'Responding to Departmental Queries',
      answer: `When a Competent Authority officer raises a clarification:\n\n• **Review the Subject & Description**: The exact requirement or missing specification is detailed in the query ticket.\n• **Timeline Watch**: Respond within the statutory deadline to prevent automatic return of the application.\n• **Composing Response**: Navigate to the **Queries** tab of the application workspace, enter your reply note, and submit.\n• **Officer Re-Review**: Once responded, the status transitions to **RESPONDED**, and the reviewing officer is notified.`,
      actions: [
        { label: 'View Open Queries', href: `${ctx.pathname}?tab=queries` },
        { label: 'Contact Investor Assistance', href: '/app/assistance' },
      ],
      suggestedFollowUps: ['When is the statutory timeline due?', 'What happens after submission?'],
    };
  }

  // 8. When is SLA due / timeline?
  if (q.includes('sla') || q.includes('timeline') || q.includes('deadline') || q.includes('service level') || q.includes('how long')) {
    return {
      intentId: 'sla_timeline',
      title: 'Specified Time Limit & Statutory Timers',
      answer: `Under the **Maharashtra Right to Public Services Act (RTS)** and MAITRI Single Window rules:\n\n• Each permission type has a statutorily defined processing limit (e.g. 15 to 45 business days).\n• The countdown begins upon formal **SUBMISSION**.\n• If an officer raises a query, the SLA timer pauses until you respond.\n• If an application breaches its specified limit without valid cause, it becomes eligible for automatic escalation to the **Empowered Committee**.`,
      actions: [
        { label: 'View Timeline Events', href: `${ctx.pathname}?tab=timeline` },
        { label: 'Track All Approvals', href: '/app/approvals' },
      ],
      suggestedFollowUps: ['What happens after submission?', 'What is Investor Assistance?'],
    };
  }

  // 9. Submission Centre & Review & Submit
  const currentPath = ctx.pathname || '';
  if (
    q.includes('submission centre') ||
    q.includes('project submission') ||
    (currentPath.includes('submission-centre') && (q.includes('what is') || q.includes('how does')))
  ) {
    return {
      intentId: 'submission_centre_overview',
      title: 'Project Submission Centre Overview',
      answer: `The **Project Submission Centre** is your proposal-wide statutory command centre. It organizes all project clearances into actionable categories:\n\n• **Ready to Submit**: All prerequisite clearances are satisfied and mandatory documents are pre-validated. You can explicitly click **Review & Submit**.\n• **Blocked by Prerequisites**: Upstream clearances (e.g., Land Allotment, Building Plan Approval) must be granted before these applications can be processed.\n• **In Preparation**: Missing mandatory documents or pending drafts. Click **Complete Documents** to attach required files.\n• **In Scrutiny**: Officially lodged with the Competent Authority. Statutory SLA review clock is actively running.\n\n*Policy Note: Antigravity strictly enforces an explicit applicant confirmation policy — applications are never auto-submitted without your review.*`,
      actions: [
        { label: 'View Dependency Map', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}/dependency-graph` },
        { label: 'Document Vault', href: '/app/documents' },
      ],
      suggestedFollowUps: [
        'Why are some clearances blocked from submission?',
        'What happens after I click Review & Submit?',
      ],
    };
  }

  if (q.includes('after submission') || q.includes('submitted') || q.includes('next after submit')) {
    return {
      intentId: 'after_submission',
      title: 'Post-Submission Departmental Workflow',
      answer: `Once you review and submit your application:\n\n1. **Department Intake**: Status moves to **UNDER_SCRUTINY** with an official reference number.\n2. **Document & Site Review**: Departmental officers inspect attached proofs. If site inspection is required, a joint visit is scheduled.\n3. **Clarifications (if needed)**: Officers may raise formal query tickets.\n4. **Statutory Decision**: The Competent Authority issues an **APPROVED** order and grants your official clearance certificate.`,
      actions: [
        { label: 'View Application Timeline', href: `${ctx.pathname}?tab=timeline` },
        { label: 'Check Site Inspections', href: '/app/inspections' },
      ],
      suggestedFollowUps: ['When is the statutory timeline due?', 'How are compliance obligations calculated?'],
    };
  }

  // 10. Compliance & Renewals
  if (q.includes('compliance') || q.includes('renewal') || q.includes('periodic') || q.includes('obligation')) {
    return {
      intentId: 'compliance_renewal',
      title: 'Dynamic Compliance & Renewal Calendar',
      answer: `Post-approval obligations are derived automatically from your issued clearances:\n\n• Clearances with periodic validity (such as Annual Consent to Operate or 3-Year Factory License) generate scheduled renewal deadlines.\n• You receive proactive reminder alerts 30 days and 7 days prior to expiry.\n• Marking a renewal as completed records audit history and schedules the subsequent statutory cycle.`,
      actions: [
        { label: 'View Compliance Calendar', href: '/app/compliance' },
      ],
      suggestedFollowUps: ['Which documents are required?', 'What is Investor Assistance?'],
    };
  }

  // 11. Investor Assistance
  if (q.includes('assistance') || q.includes('facilitat') || q.includes('help') || q.includes('nodal') || q.includes('maitri')) {
    return {
      intentId: 'investor_assistance',
      title: 'MAITRI Investor Assistance & Facilitation',
      answer: `If you encounter procedural hurdles or require regulatory clarification:\n\n• Submit an **Investor Assistance Request** under categories such as *Approval Guidance*, *Documentation Help*, or *Processing Assistance*.\n• A designated **MAITRI Nodal Officer** claims your request, reviews application context, and provides statutory guidance.\n• Coordination notes and advice are logged on your ticket timeline.`,
      actions: [
        { label: 'Open Investor Assistance', href: '/app/assistance' },
      ],
      suggestedFollowUps: ['What should I do next?', 'How can I respond to open queries?'],
    };
  }

  // Fallback default response
  return {
    intentId: 'general_guidance',
    title: 'Single Window Application Guidance',
    answer: `I can assist with statutory clearance rules, document readiness, queries, and service timelines for **${projName}**.\n\nTry asking:\n• *What is this permission and why is it required?*\n• *Which documents are required or missing?*\n• *Why is my application not ready to submit?*\n• *Which permissions can proceed in parallel?*\n• *How do I respond to a departmental query?*`,
    actions: [
      { label: 'Permissions & Approvals', href: '/app/approvals' },
      { label: 'Document Vault', href: '/app/documents' },
      { label: 'Investor Assistance', href: '/app/assistance' },
    ],
    suggestedFollowUps: [
      'What should I do next?',
      'Which documents are required?',
      'Which permissions can I start now?',
    ],
  };
}
