/**
 * Contextual Application Guidance Assistant Engine
 * 
 * Deterministic, rule-driven statutory and workflow guidance for applicants and officers.
 * Highly natural conversational responses for all common greetings, pleasantries, acknowledgments,
 * statutory questions, fee inquiries, document requirements, and status tracking.
 * Operates 100% locally and deterministically without external paid LLMs or cloud API keys.
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
 * Returns tailored prompt pills based on current pathname and context.
 */
export function getSuggestedPromptsForContext(ctx: GuidanceContext): string[] {
  const path = ctx.pathname || '';

  if (path.includes('/app/applications/')) {
    const prompts = [
      'What is this permission?',
      'Why is this required?',
      'Which documents are required?',
      'What are the statutory fees?',
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
      'How does parallel orchestration work?',
      'Why is a clearance marked blocked?',
      'How do I track application status?',
      'What are the fees for clearances?',
    ];
  }

  if (path.includes('/app/documents')) {
    return [
      'Which documents are currently missing?',
      'What file formats and size limits are accepted?',
      'How does DigiLocker verification work?',
      'How do I reuse documents across permissions?',
      'How does cross-document consistency audit work?',
    ];
  }

  if (path.includes('/app/inspections')) {
    return [
      'How do joint site inspections work?',
      'Which departments participate in the inspection?',
      'What is the site readiness checklist?',
      'How are inspection findings recorded?',
    ];
  }

  if (path.includes('/app/incentives')) {
    return [
      'What is the Package Scheme of Incentives (PSI 2019)?',
      'What subsidies am I eligible for?',
      'How is electricity duty exemption claimed?',
      'What are MSME interest subvention benefits?',
    ];
  }

  if (path.includes('/app/compliance')) {
    return [
      'How are compliance obligations calculated?',
      'When is my next statutory renewal due?',
      'How do I record a completed compliance task?',
      'Which clearances require annual renewals?',
    ];
  }

  if (path.includes('/app/projects')) {
    return [
      'What information is in the Master Profile (CAF)?',
      'How does the regulatory engine determine permissions?',
      'What is the Project Submission Centre?',
      'How do I view the dependency graph?',
    ];
  }

  if (path.includes('/app/assistance')) {
    return [
      'What is Investor Assistance & Facilitation?',
      'How does a MAITRI Nodal Officer assist me?',
      'What is the response time for assistance?',
      'How do I escalate an overdue application?',
    ];
  }

  // Default dashboard / general context
  return [
    'What should I do next?',
    'Which permissions can I start now?',
    'How do I track my application status?',
    'What are the statutory fees?',
    'When are my nearest SLA deadlines?',
  ];
}

/**
 * Resolves user query or prompt into a rich, natural, deterministic guidance response.
 */
export function resolveGuidanceQuestion(query: string, ctx: GuidanceContext): GuidanceResponse {
  const rawLower = query.toLowerCase().trim();
  const q = rawLower.replace(/[?!.,;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();
  const projName = ctx.projectData?.name || 'your investment proposal';
  const approvalName = ctx.applicationData?.approval_name || 'this statutory clearance';
  const appNumber = ctx.applicationData?.application_number;
  const authority = ctx.applicationData?.authority || 'the Competent Authority';

  // 1. Natural Greetings & Friendly Opening
  if (
    q === 'hi' ||
    q === 'hii' ||
    q === 'hiii' ||
    q === 'hello' ||
    q === 'hey' ||
    q === 'heyy' ||
    q === 'namaste' ||
    q === 'namaskar' ||
    q === 'pranam' ||
    q === 'vanakkam' ||
    q === 'kem cho' ||
    q === 'adaab' ||
    q === 'yo' ||
    q === 'sup' ||
    q === 'howdy' ||
    q.startsWith('hi ') ||
    q.startsWith('hii ') ||
    q.startsWith('hello ') ||
    q.startsWith('hey ') ||
    q.includes('good morning') ||
    q.includes('good afternoon') ||
    q.includes('good evening') ||
    q.includes('good day') ||
    q.includes('greetings') ||
    q.includes('hi there') ||
    q.includes('hello there')
  ) {
    return {
      intentId: 'greeting',
      title: 'Welcome to Udyog Setu Guidance Assistant 👋',
      answer: `Hello! Welcome to **Udyog Setu** — Maharashtra's Single Window Industrial Clearance Portal.\n\nI am your dedicated regulatory assistant. I can help you with:\n• **Statutory Clearances**: Find out which approvals are required, blocked, or ready to start in parallel.\n• **Document Requirements**: Formats, size limits, and instant DigiLocker verification.\n• **Fees & Payments**: Statutory fee calculations and state treasury (GRAS) payment procedures.\n• **Tracking & SLAs**: Monitor Right to Services (RTS) countdown timers and deemed approvals.\n• **Site Inspections & Subsidies**: Coordinated joint visits and PSI 2019 incentive matching.\n\nHow can I help your enterprise today?`,
      actions: [
        { label: 'View Clearances Roadmap', href: '/app/approvals' },
        { label: 'Open Document Vault', href: '/app/documents' },
        { label: 'Check Matched Incentives', href: '/app/incentives' },
      ],
      suggestedFollowUps: [
        'Which permissions can I start now?',
        'How do I track my application status?',
        'What are the statutory fees?',
      ],
    };
  }

  // 2. Conversational Status & "How Are You"
  if (
    q === 'how are you' ||
    q === 'how are u' ||
    q === 'how r u' ||
    q === 'hru' ||
    q === 'how do you do' ||
    q === 'hows it going' ||
    q === 'how is it going' ||
    q === 'how are you doing' ||
    q === 'how are things' ||
    q === 'how is everything' ||
    q === 'whats up' ||
    q === 'what s up' ||
    q === 'sup' ||
    q.includes('how are you') ||
    q.includes('how are u') ||
    q.includes('how r u') ||
    q.includes('how do you do') ||
    q.includes('how is it going') ||
    q.includes('hows it going') ||
    q.includes('how are things') ||
    q.includes('how is everything') ||
    q.includes('how is your day') ||
    q.includes('whats up') ||
    q.includes('what s up')
  ) {
    return {
      intentId: 'how_are_you',
      title: 'Doing Great & Ready to Help! ⚡',
      answer: `I am doing wonderful, thank you for asking! 😊 All Udyog Setu clearance engines, regulatory rule evaluators, and Maharashtra RTS time limit monitors are fully active and connected.\n\nCurrently monitoring **${projName}**. How can I help make your clearances faster and smoother today?`,
      actions: [
        { label: 'View Clearances Status', href: '/app/approvals' },
        { label: 'Open Document Vault', href: '/app/documents' },
        { label: 'Check Matched Incentives', href: '/app/incentives' },
      ],
      suggestedFollowUps: [
        'Which permissions can proceed in parallel?',
        'Are there any pending queries?',
        'What documents are missing?',
      ],
    };
  }

  // 2b. Liveness & Presence Checks ("Are you there")
  if (
    q === 'are you there' ||
    q === 'are u there' ||
    q === 'you there' ||
    q === 'are you online' ||
    q === 'are you listening' ||
    q === 'is anyone there' ||
    q === 'anyone there' ||
    q.includes('are you there') ||
    q.includes('are u there') ||
    q.includes('you there')
  ) {
    return {
      intentId: 'liveness',
      title: 'Right Here & Standing By! 🌟',
      answer: `Yes, I am right here and ready to assist you! 24/7 guidance is active for **${projName}**.\n\nWhether you need to check which approvals can run in parallel, upload verified proofs to your Document Vault, or review statutory RTS time limits, just let me know!`,
      actions: [
        { label: 'Permissions Roadmap', href: '/app/approvals' },
        { label: 'Document Vault', href: '/app/documents' },
      ],
      suggestedFollowUps: [
        'What should I do next?',
        'Which permissions can I start now?',
        'What are the statutory fees?',
      ],
    };
  }

  // 2c. Identity & Bot Questions ("Who are you", "What is your name")
  if (
    q.includes('who are you') ||
    q.includes('what is your name') ||
    q.includes('whats your name') ||
    q.includes('what s your name') ||
    q.includes('who made you') ||
    q.includes('who created you') ||
    q.includes('tell me about yourself') ||
    q.includes('are you ai') ||
    q.includes('are you a bot') ||
    q.includes('are you human')
  ) {
    return {
      intentId: 'identity',
      title: 'Udyog Setu Statutory Assistant 🏛️',
      answer: `I am the **Udyog Setu Guidance Assistant** — your interactive digital clearance guide built for the Government of Maharashtra's Single Window System.\n\nMy purpose is to guide entrepreneurs, authorized agents, and department officers through:\n• **Statutory Prerequisites**: Instant clarification on why approvals are needed and when they unlock.\n• **Paperless Documentation**: Verification standards and 1-click multi-clearance reuse.\n• **RTS Act Deadlines**: Transparent countdown tracking to prevent bureaucratic delays.\n• **Package Scheme of Incentives (PSI 2019)**: Matching your investment profile with state subsidies.`,
      actions: [
        { label: 'View Clearances Roadmap', href: '/app/approvals' },
        { label: 'Common Application Form', href: '/app/projects' },
      ],
      suggestedFollowUps: [
        'What can you do?',
        'Which permissions can I start now?',
        'How do I track my application status?',
      ],
    };
  }

  // 2d. Pleasantries & Courtesies ("Nice to meet you")
  if (
    q.includes('nice to meet you') ||
    q.includes('pleased to meet you') ||
    q.includes('glad to meet you') ||
    q.includes('good to see you')
  ) {
    return {
      intentId: 'pleasantry',
      title: 'Delighted to Assist You! 😊',
      answer: `The pleasure is entirely mine! I'm here to ensure your statutory clearance journey in Maharashtra is swift, transparent, and completely hassle-free.\n\nFeel free to ask me anything about your approvals for **${projName}**!`,
      actions: [
        { label: 'Permissions Roadmap', href: '/app/approvals' },
      ],
      suggestedFollowUps: [
        'What should I do next?',
        'Which permissions can I start now?',
      ],
    };
  }

  // 2e. Ping & Test Checks
  if (
    q === 'test' ||
    q === 'testing' ||
    q === 'ping' ||
    q === 'echo' ||
    q === 'check' ||
    q === '123' ||
    q.startsWith('testing ')
  ) {
    return {
      intentId: 'system_test',
      title: 'System Operational · 100% Responsive 🚀',
      answer: `Connection verified! All clearance databases, rule engines, and verification services for **${projName}** are responsive and ready.\n\nType any regulatory question, or pick one of the quick actions below to explore!`,
      actions: [
        { label: 'Open Dashboard', href: '/app/dashboard' },
        { label: 'Permissions & Approvals', href: '/app/approvals' },
      ],
      suggestedFollowUps: [
        'Which permissions can I start now?',
        'What documents are needed?',
      ],
    };
  }

  // 3. Pleasantries, Acknowledgments & Closings ("thanks", "ok", "bye")
  if (
    q === 'thanks' ||
    q === 'thank you' ||
    q === 'thank u' ||
    q === 'thx' ||
    q === 'ty' ||
    q === 'dhanyavaad' ||
    q === 'dhanyawad' ||
    q.startsWith('thanks') ||
    q.startsWith('thank you') ||
    q.includes('thanks a lot') ||
    q.includes('thank you so much') ||
    q.includes('appreciate it') ||
    q.includes('very helpful')
  ) {
    return {
      intentId: 'acknowledgment_thanks',
      title: "You're Very Welcome! 🙏",
      answer: `Glad I could help! I am always here to assist you throughout your clearance journey for **${projName}**.\n\nWhenever you need to check statutory time limits, upload verified proofs, or respond to officer queries, just ask!`,
      actions: [
        { label: 'Back to Dashboard', href: '/app/dashboard' },
        { label: 'View Permissions', href: '/app/approvals' },
      ],
      suggestedFollowUps: [
        'What should I do next?',
        'How do I track my application status?',
      ],
    };
  }

  if (
    q === 'ok' ||
    q === 'okay' ||
    q === 'ok got it' ||
    q === 'got it' ||
    q === 'understood' ||
    q === 'cool' ||
    q === 'great' ||
    q === 'awesome' ||
    q === 'perfect' ||
    q === 'nice' ||
    q === 'sure' ||
    q === 'alright' ||
    q === 'all right' ||
    q === 'noted'
  ) {
    return {
      intentId: 'acknowledgment_ok',
      title: 'Understood 👍',
      answer: `Great! Let me know if you would like to explore anything else, such as:\n• Checking required documents in your **Document Vault**\n• Starting parallel clearances that are ready to proceed\n• Checking statutory RTS Act countdown timers\n• Submitting an investor assistance request`,
      actions: [
        { label: 'Permissions & Approvals', href: '/app/approvals' },
        { label: 'Document Vault', href: '/app/documents' },
      ],
      suggestedFollowUps: [
        'Which permissions can I start now?',
        'What should I do next?',
      ],
    };
  }

  if (
    q === 'bye' ||
    q === 'goodbye' ||
    q === 'see you' ||
    q === 'see ya' ||
    q === 'cya' ||
    q === 'talk to you later' ||
    q.startsWith('bye') ||
    q.startsWith('goodbye')
  ) {
    return {
      intentId: 'farewell',
      title: 'Goodbye! Best of Luck with Your Project 👋',
      answer: `Goodbye! Best wishes with the setup and clearances for **${projName}**. Your Single Window portal remains active 24/7 to receive departmental updates, issue notifications, and monitor deemed approval clocks.\n\nHave a productive day!`,
      actions: [
        { label: 'Dashboard Overview', href: '/app/dashboard' },
      ],
    };
  }

  // 4. Capabilities & Help
  if (
    q.includes('who are you') ||
    q.includes('what can you do') ||
    q.includes('help me') ||
    q === 'help' ||
    q.includes('what is this bot')
  ) {
    return {
      intentId: 'capabilities',
      title: 'Udyog Setu Statutory Assistant Capabilities',
      answer: `I am your digital regulatory guide for industrial approvals in Maharashtra.\n\n**Here is what I can do for you**:\n1. **Document Validation**: Check if your files meet MIDC, MPCB, and DISH statutory standards before submission.\n2. **Dependency Resolution**: Explain why an application might be waiting on prerequisite clearances.\n3. **Parallel Processing**: Identify clearances that can proceed concurrently to save weeks of turnaround.\n4. **Statutory RTS Deadlines**: Track deemed approval countdowns under Maharashtra Right to Services.\n5. **Department Query Guidance**: Help you draft complete responses to officer clarifications.\n6. **Incentives & Subsidies**: Match your project attributes with state subsidy schemes (PSI 2019).`,
      actions: [
        { label: 'View Clearances Roadmap', href: '/app/approvals' },
        { label: 'Open Document Vault', href: '/app/documents' },
      ],
      suggestedFollowUps: [
        'Which permissions can I start now?',
        'What documents are needed?',
        'What are the statutory fees?',
      ],
    };
  }

  // 5. Tracking & Status Inquiries
  if (
    q.includes('track') ||
    q.includes('status') ||
    q.includes('where is my') ||
    q.includes('check status') ||
    q.includes('application progress') ||
    q.includes('stage')
  ) {
    return {
      intentId: 'tracking_status',
      title: 'Tracking Application Status & Progress',
      answer: `You can track all permissions in real time across 5 clear lifecycle stages:\n\n1. **NOT_STARTED / IN_PREPARATION**: Documents are being compiled or verified.\n2. **READY_TO_SUBMIT**: All prerequisite clearances and mandatory documents have passed validation.\n3. **UNDER_SCRUTINY**: Application has been officially received by the competent authority. The statutory RTS SLA clock is running.\n4. **QUERY_RAISED**: The reviewing officer requires clarification. (Note: SLA timer is paused until you reply).\n5. **APPROVED**: Clearance granted! Official digitally-signed certificate is issued with a verification QR code.`,
      actions: [
        { label: 'View Application Tracker', href: '/app/approvals' },
        { label: 'Project Control Centre', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
      ],
      suggestedFollowUps: [
        'Which permissions can I start now?',
        'When is the statutory timeline due?',
        'How can I respond to open queries?',
      ],
    };
  }

  // 6. Fees, Costs, Payments & GRAS Challans
  if (
    q.includes('fee') ||
    q.includes('cost') ||
    q.includes('charge') ||
    q.includes('payment') ||
    q.includes('gras') ||
    q.includes('challan') ||
    q.includes('price') ||
    q.includes('how much')
  ) {
    return {
      intentId: 'statutory_fees',
      title: 'Statutory Clearance Fees & Payment Information',
      answer: `Statutory clearance fees in Maharashtra are calculated deterministically based on your declared project attributes:\n\n• **MIDC Plot & Water**: Land lease premium + water connection security deposit and pipe-laying estimation charges.\n• **MPCB Consent to Establish (CTE)**: Scaled by Capital Investment tier (e.g. ₹5,000 for Micro up to ₹50,000+ for Large enterprises).\n• **Fire NOC**: Based on covered built-up area and hazard classification.\n• **Factory License (DISH)**: Proportional to maximum worker headcount and installed electrical horsepower (HP).\n\n*Payment is processed through the state treasury Government Receipt Accounting System (GRAS) with instant e-challan generation and payment receipt archival.*`,
      actions: [
        { label: 'Explore Approval Directory & Fees', href: '/app/approval-directory' },
        { label: 'Check Matched Subsidies', href: '/app/incentives' },
      ],
      suggestedFollowUps: [
        'What documents are needed?',
        'What is the Package Scheme of Incentives (PSI 2019)?',
        'Which permissions can I start now?',
      ],
    };
  }

  // 7. DigiLocker & Identity Verification
  if (
    q.includes('digilocker') ||
    q.includes('aadhaar') ||
    q.includes('pan card') ||
    q.includes('identity verification')
  ) {
    return {
      intentId: 'digilocker_verification',
      title: 'DigiLocker Verification & Document Authentication',
      answer: `Udyog Setu connects with **DigiLocker** to enable instant, paperless verification of statutory records:\n\n• **Instant Fetch**: Fetch verified Company PAN, Incorporation Certificate (MCA), and Land Allotment Letter directly from government issuers.\n• **Zero Manual Attestation**: DigiLocker verified documents carry legal parity with original physical documents under the Information Technology Act 2000.\n• **Tamper-Evident Security**: Cryptographically verified SHA-256 signatures ensure officers approve clearances without requesting physical copies.`,
      actions: [
        { label: 'Verify via DigiLocker in Vault', href: '/app/documents' },
        { label: 'View Master Business Profile', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
      ],
      suggestedFollowUps: [
        'What file formats and size limits are accepted?',
        'Which documents are required?',
      ],
    };
  }

  // 8. File Formats, Upload Limits & Document Rules
  if (
    q.includes('format') ||
    q.includes('size limit') ||
    q.includes('upload limit') ||
    q.includes('file size') ||
    q.includes('pdf') ||
    q.includes('jpeg')
  ) {
    return {
      intentId: 'document_limits',
      title: 'Accepted File Formats & Upload Specifications',
      answer: `When uploading exhibits to your **Document Vault**:\n\n• **Supported Formats**: PDF (recommended for multi-page deeds & certificates), JPG, JPEG, and PNG.\n• **Maximum File Size**: Up to **25 MB** per document exhibit.\n• **Resolution Guidance**: 200 to 300 DPI is optimal for clear OCR and text recognition.\n• **Architectural / Machinery Drawings**: Scaled factory layout drawings should be uploaded in vector PDF or high-resolution format with visible north markers and dimensions.`,
      actions: [
        { label: 'Open Document Vault', href: '/app/documents' },
      ],
      suggestedFollowUps: [
        'Which documents are required?',
        'How does document pre-validation work?',
      ],
    };
  }

  // 9. Site Inspections & Joint Visits
  if (
    q.includes('inspect') ||
    q.includes('site visit') ||
    q.includes('joint inspection') ||
    q.includes('factory visit') ||
    q.includes('physical visit')
  ) {
    return {
      intentId: 'site_inspection',
      title: 'Designated Joint Site Inspection Policy',
      answer: `Under the Maharashtra Single Window mandate, factory site visits are coordinated **jointly** across authorities (MIDC, MPCB, and Labour Department):\n\n• **One Single Date**: Instead of separate departmental visits, inspecting officers synchronize on a unified inspection date.\n• **Readiness Checklist**: You receive advance notification and a digital readiness checklist prior to the visit.\n• **Digital Findings**: Officers record geo-tagged observations and findings on their mobile inspection desks.\n• **48-Hour Report Upload**: Statutory reports must be uploaded within 48 hours to prevent delays in the approval decision.`,
      actions: [
        { label: 'View Site Inspections Calendar', href: '/app/inspections' },
      ],
      suggestedFollowUps: [
        'When is the statutory timeline due?',
        'What should I do next?',
      ],
    };
  }

  // 10. Subsidies, Incentives & Schemes
  if (
    q.includes('incentive') ||
    q.includes('scheme') ||
    q.includes('subsidy') ||
    q.includes('subsidies') ||
    q.includes('grant') ||
    q.includes('psi') ||
    q.includes('stamp duty waiver') ||
    q.includes('electricity duty')
  ) {
    return {
      intentId: 'incentive_schemes',
      title: 'Maharashtra Industrial Incentive Schemes & Subsidies',
      answer: `Based on your undertaking's sector and location, you are evaluated for state promotional packages:\n\n• **Maharashtra Package Scheme of Incentives (PSI 2019)**: Capital subsidies of 20% to 40% on Fixed Capital Investment (FCI) depending on industrial taluka category (Zone A to D+).\n• **Electricity Duty Exemption**: 100% exemption for 7 to 10 years for eligible manufacturing units.\n• **Stamp Duty Exemption**: 100% waiver on land purchase / lease agreement execution.\n• **Interest Subvention**: 5% interest subsidy on term loans for Micro, Small and Medium Enterprises (MSMEs).`,
      actions: [
        { label: 'View Matched Incentives', href: '/app/incentives' },
      ],
      suggestedFollowUps: [
        'What documents are needed?',
        'What are the statutory fees?',
        'Which permissions can I start now?',
      ],
    };
  }

  // 11. Certificates & Sanction Letters
  if (
    q.includes('certificate') ||
    q.includes('download approval') ||
    q.includes('sanction order') ||
    q.includes('approval letter') ||
    q.includes('final clearance')
  ) {
    return {
      intentId: 'download_certificate',
      title: 'Clearance Certificates & Digital Signatures',
      answer: `Once an application reaches **APPROVED** status:\n\n• **Digital Signature**: The Competent Authority issues an official digitally signed sanction order conforming to state standards.\n• **Tamper-Proof QR Code**: Each certificate includes a verifiable QR code linking directly to the state Single Window verification portal.\n• **Permanent Vault Storage**: Your approved certificates are automatically archived in your **Document Vault** for instant reuse in downstream clearances or bank loan processing.`,
      actions: [
        { label: 'View Approved Permissions', href: '/app/approvals' },
        { label: 'Open Document Vault', href: '/app/documents' },
      ],
      suggestedFollowUps: [
        'How are compliance obligations calculated?',
        'When is my next statutory renewal due?',
      ],
    };
  }

  // 12. Contact, Support, Helpline & Nodal Facilitation
  if (
    q.includes('contact') ||
    q.includes('helpline') ||
    q.includes('phone') ||
    q.includes('email') ||
    q.includes('support') ||
    q.includes('nodal officer') ||
    q.includes('maitri') ||
    q.includes('assistance') ||
    q.includes('grievance') ||
    q.includes('escalate')
  ) {
    return {
      intentId: 'investor_assistance',
      title: 'MAITRI Investor Assistance & Nodal Facilitation',
      answer: `If you encounter procedural hurdles, inter-departmental delays, or technical questions:\n\n• **Submit an Assistance Request**: Open the **Investor Assistance** desk to lodge a request under categories like *Approval Guidance*, *Document Help*, or *Processing Escalation*.\n• **Dedicated Nodal Officer**: A designated MAITRI Nodal Facilitation Officer claims your ticket, liaises with the reviewing authority, and provides official coordination notes.\n• **Empowered Committee Escalation**: Applications that breach RTS Act statutory timelines can be escalated directly to the District Collector's Empowered Committee.`,
      actions: [
        { label: 'Submit Assistance Request', href: '/app/assistance' },
        { label: 'View Specified Time Limits', href: '/government/sla-monitor' },
      ],
      suggestedFollowUps: [
        'When is the statutory timeline due?',
        'How can I respond to open queries?',
      ],
    };
  }

  // 13. Understanding This Specific Permission
  if (q.includes('what is this permission') || q.includes('about this permission') || q.includes('what does this approval mean')) {
    return {
      intentId: 'what_is_permission',
      title: `Understanding ${approvalName}`,
      answer: `**${approvalName}** is a statutory approval granted by **${authority}**.\n\nUnder Maharashtra Single Window regulations, this permission authorizes your industrial undertaking to proceed with specific site establishment, utility connection, or operational activities in accordance with state statutory acts.`,
      actions: [
        { label: 'View Permission Details', href: `/app/approvals` },
        { label: 'Check Required Documents', href: `/app/documents` },
      ],
      suggestedFollowUps: ['Why is this required?', 'Which documents are required?', 'When is the statutory timeline due?'],
    };
  }

  // 14. Why is this required?
  if (q.includes('why is this required') || q.includes('why required') || q.includes('statutory reason') || q.includes('basis of requirement')) {
    return {
      intentId: 'why_required',
      title: `Statutory Basis for ${approvalName}`,
      answer: `This approval applies to **${projName}** based on your declared industrial proposal attributes:\n\n• **Sector & Scale**: Classified under scheduled industrial operations requiring statutory clearance.\n• **Jurisdiction**: Falls under ${ctx.projectData?.district || 'district'} industrial development authority jurisdiction.\n• **Environmental & Safety Standards**: Applicable state pollution and municipal safety regulations mandate obtaining this prior to site development.`,
      actions: [
        { label: 'Review Master Business Profile', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
        { label: 'View Statutory Roadmap', href: `/app/approvals` },
      ],
      suggestedFollowUps: ['Which documents are required?', 'Which permissions can I start now?'],
    };
  }

  // 15. Required Documents
  if (q.includes('which document') || q.includes('required document') || q.includes('missing document') || q.includes('what documents') || q.includes('documents needed')) {
    return {
      intentId: 'required_documents',
      title: 'Documentation & Vault Pre-Validation Requirements',
      answer: `Statutory permissions require certified proofs uploaded via your **Document Vault**:\n\n1. **Corporate Identity Proof**: Company PAN Card / Certificate of Incorporation.\n2. **Premises Allotment / Title**: Registered Lease Agreement or MIDC Allotment Letter.\n3. **Engineering Drawings**: Scaled Architectural & Machine Layout Plans.\n4. **Prerequisite Statutory Clearances**: Consent to Establish (MPCB) or Fire Safety NOC where applicable.\n\n*All uploaded files undergo automated pre-validation to detect format errors, expired certificates, and document type mismatches before submission.*`,
      actions: [
        { label: 'Open Document Vault', href: '/app/documents' },
        { label: 'Check Application Checklist', href: '/app/approvals' },
      ],
      suggestedFollowUps: ['How does DigiLocker verification work?', 'What file formats and size limits are accepted?'],
    };
  }

  // 16. Why is my application not ready?
  if (q.includes('not ready') || q.includes('why not ready') || q.includes('readiness check') || q.includes('readiness fail')) {
    return {
      intentId: 'why_not_ready',
      title: 'Pre-Submission Readiness Blocker Analysis',
      answer: `Applications remain in **NOT READY** state until 3 automated criteria pass:\n\n• **Mandatory Documents Attached**: Every required document type must be linked from your Document Vault.\n• **Validity & Integrity**: Attached certificates must have a status of VERIFIED or passed pre-validation without expiration.\n• **No Open Blockers**: No unaddressed departmental queries or incomplete prerequisite clearances.\n\nYou can run an automated consistency audit in the Document Vault anytime.`,
      actions: [
        { label: 'Open Document Vault', href: '/app/documents' },
        { label: 'Review Permissions', href: '/app/approvals' },
      ],
      suggestedFollowUps: ['Which documents are required?', 'Which permissions can I start now?'],
    };
  }

  // 17. What should I do next?
  if (q.includes('what should i do next') || q.includes('next action') || q.includes('next step') || q.includes('what next')) {
    return {
      intentId: 'what_next',
      title: 'Next Best Statutory Action',
      answer: `Based on current Single Window workflow state for **${projName}**:\n\n1. **Complete Eligible Clearances**: Permissions marked with green **Can Proceed in Parallel** can be started immediately.\n2. **Resolve Open Queries**: If authorities have requested clarifications, responding promptly avoids SLA clock suspension.\n3. **Attach Vault Documents**: Use the Document Vault to reuse verified land titles and company PAN cards.\n4. **Review Pre-Submission Readiness**: Verify all documents before final departmental review and submission.`,
      actions: [
        { label: 'View Project Control Centre', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}` },
        { label: 'Start Eligible Clearances', href: '/app/approvals' },
      ],
      suggestedFollowUps: ['Which permissions can I start now?', 'How can I respond to open queries?'],
    };
  }

  // 18. Parallel Orchestration
  if (q.includes('start now') || q.includes('parallel') || q.includes('can i start') || q.includes('eligible clearance')) {
    return {
      intentId: 'parallel_approvals',
      title: 'Parallel Processing & Eligible Applications',
      answer: `Single Window coordinates parallel processing under Maharashtra statutory timelines:\n\n• Permissions without prior dependencies (e.g. **MIDC Water Connection**, **MPCB Consent to Establish**) can be prepared concurrently.\n• Approvals that require prior legal clearance (e.g. Factory License requires approved Building Plan) will remain blocked until prerequisite approvals are issued.\n• Use the **Start Eligible Applications** action on the Permissions page to safely initialize all eligible workspaces at once without duplicate entries.`,
      actions: [
        { label: 'Start Parallel Clearances', href: '/app/approvals' },
        { label: 'View Dependency Graph', href: `/app/projects/${ctx.projectId || 'proj-abc-foods-001'}?tab=dependency-graph` },
      ],
      suggestedFollowUps: ['How do I track my application status?', 'What should I do next?'],
    };
  }

  // 19. Queries & Clarifications
  if (q.includes('query') || q.includes('respond to query') || q.includes('clarification') || q.includes('officer query')) {
    return {
      intentId: 'respond_query',
      title: 'Responding to Departmental Queries',
      answer: `When a Competent Authority officer raises a clarification:\n\n• **Review the Subject & Description**: The exact requirement or missing specification is detailed in the query ticket.\n• **Timeline Watch**: Respond within the statutory deadline to prevent automatic return of the application.\n• **Composing Response**: Navigate to the Queries section of your application workspace, enter your explanation note, and attach any requested documents.\n• **Officer Re-Review**: Once responded, the status transitions to **RESPONDED**, and the reviewing officer is notified while the SLA countdown resumes.`,
      actions: [
        { label: 'Open Permissions Workspace', href: '/app/approvals' },
        { label: 'Contact Investor Assistance', href: '/app/assistance' },
      ],
      suggestedFollowUps: ['When is the statutory timeline due?', 'How do I track my application status?'],
    };
  }

  // 20. SLA, Timelines & RTS Act
  if (q.includes('sla') || q.includes('timeline') || q.includes('deadline') || q.includes('service level') || q.includes('how long') || q.includes('rts')) {
    return {
      intentId: 'sla_timeline',
      title: 'Specified Time Limit & Statutory Timers (RTS Act)',
      answer: `Under the **Maharashtra Right to Public Services Act (RTS)** and MAITRI Single Window rules:\n\n• Each permission type has a statutorily defined processing limit (e.g. 15 to 45 business days).\n• The countdown begins upon formal submission.\n• If an officer raises a query, the SLA timer pauses until you respond.\n• If an application breaches its specified limit without valid cause, it becomes eligible for automatic escalation to the **Empowered Committee** under the District Collector.`,
      actions: [
        { label: 'View Time Limits Monitor', href: '/government/sla-monitor' },
        { label: 'Track All Approvals', href: '/app/approvals' },
      ],
      suggestedFollowUps: ['What should I do next?', 'What is Investor Assistance?'],
    };
  }

  // 21. Compliance & Renewals
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

  // Default fallback response
  return {
    intentId: 'general_guidance',
    title: 'Single Window Application Guidance',
    answer: `I am your digital statutory assistant for **${projName}**.\n\nYou can ask me about:\n• *Which permissions can I start now?*\n• *How do I track my application status?*\n• *What are the statutory fees?*\n• *What file formats and upload limits are accepted?*\n• *How do joint site inspections work?*\n• *What subsidies and schemes (PSI 2019) apply?*`,
    actions: [
      { label: 'Permissions & Approvals', href: '/app/approvals' },
      { label: 'Document Vault', href: '/app/documents' },
      { label: 'Investor Assistance', href: '/app/assistance' },
    ],
    suggestedFollowUps: [
      'What should I do next?',
      'Which permissions can I start now?',
      'How do I track my application status?',
    ],
  };
}
