import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { PRESCRIBED_FORMS } from './prescribedFormService';

export interface DocumentGuidanceItem {
  id: string;
  approval_type_id: string;
  approval_name: string;
  document_type: string;
  mandatory: boolean;
  condition?: string | null;

  // Statutory guidance
  purpose: string;
  format: string;
  max_size_mb: number;
  issuing_authority: string;
  validity_rule: string;

  // Prescribed statutory template metadata (if configured)
  prescribed_form?: {
    id: string;
    form_name: string;
    category: string;
    source_label: string;
    download_url: string;
    file_name: string;
  } | null;

  // Application attachment state (when evaluated in application context)
  is_attached: boolean;
  attached_document_id?: string;
  attached_file_name?: string;
  attached_status?: string;
  attached_expiry_date?: string | null;
  is_expired?: boolean;
  is_expiring_soon?: boolean;

  // Vault reuse status
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

/**
 * Statutory Document Guidance Knowledge Base
 */
interface StatutoryGuidanceSpec {
  purpose: string;
  format: string;
  max_size_mb: number;
  issuing_authority: string;
  validity_rule: string;
  form_id_match?: string;
}

const STATUTORY_GUIDANCE: Record<string, StatutoryGuidanceSpec> = {
  'Company PAN Card': {
    purpose:
      'Statutory tax entity identification under the Income Tax Act, 1961. Validates the registered corporate identity and tax residency of the enterprise.',
    format: 'PDF / JPEG / PNG',
    max_size_mb: 5,
    issuing_authority: 'Income Tax Department of India / Protean (NSDL) / UTIITSL',
    validity_rule: 'Permanent / Non-expiring statutory identity document',
  },
  'Land Ownership / Lease Agreement': {
    purpose:
      'Verifies lawful possession, demarcation, and title tenure of the project plot within MIDC industrial zones or private industrial converted land.',
    format: 'Searchable PDF with registered endorsement',
    max_size_mb: 20,
    issuing_authority: 'MIDC Land Section / Department of Registration & Stamps, Maharashtra',
    validity_rule: 'Must cover entire operational lifespan or active 95-year MIDC lease tenure',
  },
  'Environmental Impact Assessment Report': {
    purpose:
      'Detailed environmental analysis evaluating ambient air quality, industrial wastewater balance, hazardous solid waste handling, and green belt buffers per EIA Notification 2006.',
    format: 'Comprehensive PDF with executive summary and process flowcharts',
    max_size_mb: 50,
    issuing_authority: 'QCI / NABET Accredited Environmental Consultant',
    validity_rule: 'Statutory validity of 7 years covering project establishment phase',
    form_id_match: 'form-mpcb-cte-red',
  },
  'Environmental Impact Assessment (EIA)': {
    purpose:
      'Environmental Impact Assessment assessing baseline ecology, stack emissions, and effluent treatment compliance under Environment (Protection) Act, 1986.',
    format: 'Searchable PDF',
    max_size_mb: 50,
    issuing_authority: 'NABET / QCI Accredited Environmental Consulting Organisation',
    validity_rule: 'Valid for establishment period up to commercial commissioning',
    form_id_match: 'form-mpcb-cte-red',
  },
  'Architectural / Structural Drawings': {
    purpose:
      'Detailed building elevations, sectional drawings, built-up area calculations, and structural safety certificates adhering to the National Building Code (NBC 2016).',
    format: 'Architectural PDF / CAD Drawing (Scale 1:100)',
    max_size_mb: 30,
    issuing_authority: 'Council of Architecture (COA) Registered Architect & Licensed Structural Engineer',
    validity_rule: 'Valid for 3 years from planning authority sanction date',
  },
  'Site Layout Plan': {
    purpose:
      'Master layout map illustrating exact boundary coordinates, internal circulation roads, building footprints, parking bays, and utility ingress points.',
    format: 'Scaled Architectural Drawing / PDF',
    max_size_mb: 25,
    issuing_authority: 'Registered Architect / Town Planner / MIDC Planning Department',
    validity_rule: 'Permanent for the approved development boundary',
  },
  'Process Flow Diagram': {
    purpose:
      'Schematic technical drawing detailing unit operations, raw material stoichiometry, temperature/pressure regimes, and point sources of emissions or wastewater.',
    format: 'PDF / High-resolution schematic diagram',
    max_size_mb: 15,
    issuing_authority: 'Process Engineering Consultant / Chief Technical Officer',
    validity_rule: 'Valid until proposed manufacturing process undergoes substantial expansion',
  },
  'Effluent Treatment Plan': {
    purpose:
      'Engineering design drawings and hydraulic flow calculations for proposed ETP/STP, tertiary polishing, and Zero Liquid Discharge (ZLD) recycling system.',
    format: 'Technical PDF with equipment schedule',
    max_size_mb: 20,
    issuing_authority: 'Chartered Environmental Engineer / Certified Wastewater Technology Supplier',
    validity_rule: 'Permanent design document tied to operating capacity',
    form_id_match: 'form-mpcb-cte-red',
  },
  'Fire Safety Layout Drawing': {
    purpose:
      'Floor-wise fire prevention plan showing external fire hydrants, riser pipes, automatic sprinkler coverage, fire alarm call points, and emergency escape stairs per Maharashtra Fire Act.',
    format: 'Architectural CAD / Scaled PDF',
    max_size_mb: 20,
    issuing_authority: 'Directorate of Maharashtra Fire Services / Licensed Fire Protection Agency',
    validity_rule: 'Provisional NOC valid for 1 year during construction; requires renewal',
    form_id_match: 'form-fire-noc-b1',
  },
  'Memorandum of Association (MoA)': {
    purpose:
      'Statutory constitutional document specifying the corporate object clauses, authorized share capital, and founding subscribers under the Companies Act, 2013.',
    format: 'Official RoC signed PDF',
    max_size_mb: 15,
    issuing_authority: 'Registrar of Companies (RoC), Ministry of Corporate Affairs (MCA)',
    validity_rule: 'Permanent corporate constitution',
  },
  'Workers Compensation Insurance': {
    purpose:
      'Statutory policy indemnifying factory personnel against occupational injury, disability, or death under the Employees’ Compensation Act, 1923.',
    format: 'Insurance Policy Schedule PDF',
    max_size_mb: 10,
    issuing_authority: 'IRDAI Registered General Insurance Company',
    validity_rule: 'Annual statutory renewal required; policy must remain in force during factory operations',
  },
  'Building Plan Approval Letter': {
    purpose:
      'Official development permission and building sanction order granted by the Special Planning Authority confirming statutory zoning and setback compliance.',
    format: 'Digitally signed Sanction Order PDF',
    max_size_mb: 10,
    issuing_authority: 'MIDC Special Planning Authority (SPA) / Town Planning Authority',
    validity_rule: 'Valid for 2 years (extendable upon commencement of construction)',
  },
  'Pollution Consent to Establish Certificate': {
    purpose:
      'Statutory prerequisite consent granted under Section 25 of Water Act 1974 and Section 21 of Air Act 1981 prior to installing machinery or initiating civil works.',
    format: 'Digitally signed MPCB CTE Order PDF',
    max_size_mb: 10,
    issuing_authority: 'Maharashtra Pollution Control Board (MPCB)',
    validity_rule: 'Valid for 5 years or until commercial commissioning of industrial unit',
  },
  'Factory License Copy': {
    purpose:
      'Statutory operating registration and factory licence endorsed under Section 6 of the Factories Act, 1948 and Maharashtra Factories Rules, 1963.',
    format: 'Official DISH License Endorsement PDF',
    max_size_mb: 10,
    issuing_authority: 'Directorate of Industrial Safety and Health (DISH), Maharashtra',
    validity_rule: 'Periodic statutory renewal required based on licensed worker count & power kW',
    form_id_match: 'form-dish-factory-licence',
  },
  'Factory Layout Plan': {
    purpose:
      'Factory floor layout specifying machinery spacing, internal transit gangways (min 1.5m), cross-ventilation, and fire egress routes per Rule 4 of Maharashtra Factories Rules.',
    format: 'Architectural PDF / CAD Drawing',
    max_size_mb: 25,
    issuing_authority: 'Licensed Architect / Competent Person under Section 6 of Factories Act',
    validity_rule: 'Valid until layout or machinery installation is altered',
    form_id_match: 'form-dish-factory-licence',
  },
  'Food Processing Unit Layout': {
    purpose:
      'Hygienic facility schematic showing physical separation of raw receiving, food preparation, packaging zones, and pest barrier thresholds under FSS Act, 2006.',
    format: 'Sanitary Facility Plan PDF',
    max_size_mb: 15,
    issuing_authority: 'Certified Food Safety Specialist / Project Engineer',
    validity_rule: 'Valid for food business establishment life cycle',
  },
  'Load Requirement Details': {
    purpose:
      'Statutory technical load calculation, transformer sizing, and single line diagram (SLD) for power connectivity under Maharashtra Electricity Regulatory Commission norms.',
    format: 'Engineering PDF / Single Line Diagram',
    max_size_mb: 10,
    issuing_authority: 'Government Licensed Electrical Contractor / Chartered Electrical Engineer',
    validity_rule: 'Permanent until load expansion / contract demand enhancement',
  },
  'Project Process Description': {
    purpose:
      'Comprehensive narrative of manufacturing methodology, capacity ratings, fuel utilization, raw materials, and finished goods logistics.',
    format: 'Project Report PDF',
    max_size_mb: 10,
    issuing_authority: 'Applicant Project Management Team / Technical Director',
    validity_rule: 'Permanent descriptive dossier',
  },
  'Environmental Clearance Certificate': {
    purpose:
      'Prior Environmental Clearance (EC) order issued by SEIAA / MoEFCC for categorized industrial projects.',
    format: 'Official Environmental Clearance Order PDF',
    max_size_mb: 15,
    issuing_authority: 'State Environment Impact Assessment Authority (SEIAA) / MoEFCC',
    validity_rule: 'Valid for 7 to 10 years per statutory notification',
  },
};

const DEFAULT_GUIDANCE: StatutoryGuidanceSpec = {
  purpose: 'Statutory documentary proof required to establish legal, regulatory, or technical compliance.',
  format: 'Official PDF (Searchable format preferred)',
  max_size_mb: 20,
  issuing_authority: 'Competent Regulatory Body / Licensed Statutory Professional',
  validity_rule: 'Must remain valid at the time of official departmental scrutiny',
};

/**
 * Returns matching statutory guidance for any given document type
 */
export function getGuidanceSpec(documentType: string): StatutoryGuidanceSpec {
  if (STATUTORY_GUIDANCE[documentType]) {
    return STATUTORY_GUIDANCE[documentType];
  }
  // Try partial case-insensitive match
  const lower = documentType.toLowerCase();
  for (const [key, spec] of Object.entries(STATUTORY_GUIDANCE)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return spec;
    }
  }
  return DEFAULT_GUIDANCE;
}

/**
 * Finds matching prescribed template (if any)
 */
function findPrescribedTemplate(documentType: string, spec: StatutoryGuidanceSpec) {
  if (spec.form_id_match) {
    const matched = PRESCRIBED_FORMS.find((f) => f.id === spec.form_id_match);
    if (matched) {
      return {
        id: matched.id,
        form_name: matched.form_name,
        category: matched.category,
        source_label: matched.source_label,
        download_url: `/api/approval-types/forms/${matched.id}/download`,
        file_name: matched.file_name,
      };
    }
  }

  // Check by document type match
  const matched = PRESCRIBED_FORMS.find(
    (f) =>
      f.document_type.toLowerCase() === documentType.toLowerCase() ||
      documentType.toLowerCase().includes(f.document_type.toLowerCase())
  );
  if (matched) {
    return {
      id: matched.id,
      form_name: matched.form_name,
      category: matched.category,
      source_label: matched.source_label,
      download_url: `/api/approval-types/forms/${matched.id}/download`,
      file_name: matched.file_name,
    };
  }

  return null;
}

/**
 * Evaluates comprehensive document guidance and checklist for a specific application
 */
export async function getApplicationDocumentGuidance(
  applicationId: string
): Promise<ApplicationDocumentGuidanceResponse> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project_approval: {
        include: {
          approval_type: {
            include: { document_requirements: true },
          },
          project: true,
        },
      },
      application_documents: {
        include: { document: true },
      },
    },
  });

  if (!application) throw new NotFoundError('Application not found');

  const approvalType = application.project_approval.approval_type;
  const projectId = application.project_approval.project_id;

  // Fetch all documents currently in the project vault
  const vaultDocs = await prisma.document.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'desc' },
  });

  // Calculate reuse counts across the organization/project
  const reuseCountsRaw = await prisma.applicationDocument.groupBy({
    by: ['document_id'],
    _count: { document_id: true },
    where: { document_id: { in: vaultDocs.map((d) => d.id) } },
  });
  const reuseMap = new Map(reuseCountsRaw.map((r) => [r.document_id, r._count.document_id]));

  const attachedDocMap = new Map<string, any>(
    application.application_documents.map((ad) => [ad.document.document_type.toLowerCase(), ad])
  );

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);

  const docRequirements = approvalType.document_requirements || [];
  const items: DocumentGuidanceItem[] = docRequirements.map((req) => {
    const spec = getGuidanceSpec(req.document_type);
    const prescribed = findPrescribedTemplate(req.document_type, spec);

    // Check application attached state
    const attached = attachedDocMap.get(req.document_type.toLowerCase());
    const isAttached = !!attached;
    let attachedStatus = isAttached ? attached.document.verification_status : undefined;
    let isExpired = false;
    let isExpiringSoon = false;

    if (isAttached && attached.document.expiry_date) {
      const expDate = new Date(attached.document.expiry_date);
      if (expDate <= now) isExpired = true;
      else if (expDate < in30Days) isExpiringSoon = true;
    }

    // Check Vault match for 1-click reuse
    const vaultMatch = vaultDocs.find(
      (vd) =>
        vd.document_type.toLowerCase() === req.document_type.toLowerCase() &&
        vd.verification_status !== 'REJECTED'
    );

    const availableInVault = !!vaultMatch;
    const canOneClickReuse = availableInVault && !isAttached;

    return {
      id: req.id,
      approval_type_id: approvalType.id,
      approval_name: approvalType.name,
      document_type: req.document_type,
      mandatory: req.mandatory,
      condition: req.condition,

      purpose: spec.purpose,
      format: spec.format,
      max_size_mb: spec.max_size_mb,
      issuing_authority: spec.issuing_authority,
      validity_rule: spec.validity_rule,
      prescribed_form: prescribed,

      is_attached: isAttached,
      attached_document_id: attached?.document?.id,
      attached_file_name: attached?.document?.file_name,
      attached_status: attachedStatus,
      attached_expiry_date: attached?.document?.expiry_date ? String(attached.document.expiry_date) : null,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,

      vault_reuse: {
        available_in_vault: availableInVault,
        vault_document_id: vaultMatch?.id,
        vault_file_name: vaultMatch?.file_name,
        vault_verification_status: vaultMatch?.verification_status,
        vault_expiry_date: vaultMatch?.expiry_date ? String(vaultMatch.expiry_date) : null,
        reuse_count: vaultMatch ? reuseMap.get(vaultMatch.id) ?? 0 : 0,
        can_one_click_reuse: canOneClickReuse,
      },
    };
  });

  const requiredDocuments = items.filter((i) => i.mandatory);
  const optionalDocuments = items.filter((i) => !i.mandatory);

  const attachedCount = items.filter((i) => i.is_attached).length;
  const attachedMandatoryCount = requiredDocuments.filter((i) => i.is_attached && !i.is_expired).length;
  const missingMandatoryCount = requiredDocuments.length - attachedMandatoryCount;
  const reusableCount = items.filter((i) => i.vault_reuse.can_one_click_reuse).length;
  const readinessPct =
    requiredDocuments.length > 0
      ? Math.round((attachedMandatoryCount / requiredDocuments.length) * 100)
      : 100;

  return {
    application_id: application.id,
    application_number: application.application_number,
    approval_type: {
      id: approvalType.id,
      name: approvalType.name,
      authority: approvalType.authority,
      category: approvalType.category,
      default_sla_days: approvalType.default_sla_days,
    },
    metrics: {
      total_requirements: items.length,
      mandatory_count: requiredDocuments.length,
      optional_count: optionalDocuments.length,
      attached_count: attachedCount,
      attached_mandatory_count: attachedMandatoryCount,
      missing_mandatory_count: missingMandatoryCount,
      reusable_from_vault_count: reusableCount,
      readiness_percentage: readinessPct,
      all_mandatory_satisfied: missingMandatoryCount === 0,
    },
    required_documents: requiredDocuments,
    optional_documents: optionalDocuments,
    all_documents: items,
  };
}

/**
 * Returns project-wide document requirements grouped by clearance type with statutory guidance and vault status
 */
export async function getProjectDocumentGuidance(
  projectId: string
): Promise<ProjectDocumentGuidanceResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      project_approvals: {
        include: {
          approval_type: {
            include: { document_requirements: true },
          },
          application: {
            include: {
              application_documents: { include: { document: true } },
            },
          },
        },
      },
    },
  });

  if (!project) throw new NotFoundError('Project not found');

  const vaultDocs = await prisma.document.findMany({
    where: { project_id: projectId },
  });

  const reuseCountsRaw = await prisma.applicationDocument.groupBy({
    by: ['document_id'],
    _count: { document_id: true },
    where: { document_id: { in: vaultDocs.map((d) => d.id) } },
  });
  const reuseMap = new Map(reuseCountsRaw.map((r) => [r.document_id, r._count.document_id]));

  const clearances: ClearanceDocumentGuidanceGroup[] = [];

  for (const pa of project.project_approvals) {
    const at = pa.approval_type;
    const app = pa.application;
    const attachedMap = new Map<string, any>(
      app?.application_documents?.map((ad) => [ad.document.document_type.toLowerCase(), ad]) || []
    );

    const docItems: DocumentGuidanceItem[] = (at.document_requirements || []).map((req) => {
      const spec = getGuidanceSpec(req.document_type);
      const prescribed = findPrescribedTemplate(req.document_type, spec);
      const attached = attachedMap.get(req.document_type.toLowerCase());
      const isAttached = !!attached;

      const vaultMatch = vaultDocs.find(
        (vd) =>
          vd.document_type.toLowerCase() === req.document_type.toLowerCase() &&
          vd.verification_status !== 'REJECTED'
      );

      return {
        id: req.id,
        approval_type_id: at.id,
        approval_name: at.name,
        document_type: req.document_type,
        mandatory: req.mandatory,
        condition: req.condition,

        purpose: spec.purpose,
        format: spec.format,
        max_size_mb: spec.max_size_mb,
        issuing_authority: spec.issuing_authority,
        validity_rule: spec.validity_rule,
        prescribed_form: prescribed,

        is_attached: isAttached,
        attached_document_id: attached?.document?.id,
        attached_file_name: attached?.document?.file_name,
        attached_status: attached?.document?.verification_status,

        vault_reuse: {
          available_in_vault: !!vaultMatch,
          vault_document_id: vaultMatch?.id,
          vault_file_name: vaultMatch?.file_name,
          vault_verification_status: vaultMatch?.verification_status,
          vault_expiry_date: vaultMatch?.expiry_date ? String(vaultMatch.expiry_date) : null,
          reuse_count: vaultMatch ? reuseMap.get(vaultMatch.id) ?? 0 : 0,
          can_one_click_reuse: !!vaultMatch && !isAttached,
        },
      };
    });

    const required = docItems.filter((d) => d.mandatory);
    const optional = docItems.filter((d) => !d.mandatory);
    const satisfied = required.filter(
      (d) => d.is_attached || d.vault_reuse.available_in_vault
    ).length;
    const completionRate =
      required.length > 0 ? Math.round((satisfied / required.length) * 100) : 100;

    clearances.push({
      approval_id: at.id,
      approval_name: at.name,
      authority: at.authority,
      category: at.category,
      sla_days: at.default_sla_days,
      application_id: app?.id,
      application_status: app?.status,
      total_requirements: docItems.length,
      mandatory_count: required.length,
      satisfied_count: satisfied,
      completion_rate: completionRate,
      required_documents: required,
      optional_documents: optional,
    });
  }

  return {
    project_id: project.id,
    project_name: project.name,
    total_vault_documents: vaultDocs.length,
    verified_vault_documents: vaultDocs.filter((d) => d.verification_status === 'VERIFIED').length,
    clearances,
  };
}
