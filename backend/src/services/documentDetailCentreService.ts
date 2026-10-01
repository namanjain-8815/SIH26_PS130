import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { recordAudit } from './auditService';
import { getDocumentExtraction, listDocuments } from './documentService';
import { FIELD_DEFINITIONS, FieldDefinition, ExtractedFieldRecord } from './pdfExtractionService';


export interface FieldSourceOccurrence {
  document_id: string;
  document_name: string;
  document_type: string;
  extracted_value: string | number;
  extracted_at: string;
  status: string;
}

export interface AggregatedFieldDetail {
  key: string;
  label: string;
  category: 'Identity' | 'Project' | 'Site' | 'Utilities' | 'Dates' | 'References';
  master_value: string | number | null;
  original_extracted_values: FieldSourceOccurrence[];
  has_conflict: boolean;
  conflict_summary?: string;
  is_overridden: boolean;
  provenance: string;
  overridden_at?: string;
  override_actor?: string;
  override_note?: string;
  downstream_targets?: string[];
  last_updated: string;
}

export interface DocumentDetailCentrePayload {
  project_id: string;
  project_name: string;
  summary: {
    total_documents: number;
    total_fields_extracted: number;
    conflicts_detected: number;
    user_confirmed_fields: number;
  };
  categories: {
    Identity: AggregatedFieldDetail[];
    Project: AggregatedFieldDetail[];
    Site: AggregatedFieldDetail[];
    Utilities: AggregatedFieldDetail[];
    Dates: AggregatedFieldDetail[];
    References: AggregatedFieldDetail[];
  };
}

const DOWNSTREAM_REUSE_MAP: Record<string, string[]> = {
  legal_name: ['Common Application Form (CAF)', 'Organization Tax Profile', 'Department Submissions'],
  pan: ['Common Application Form (CAF)', 'Organization Identity', 'Revenue Verification'],
  gstin: ['Common Application Form (CAF)', 'Commercial Tax Clearance', 'Incentives & Subsidies'],
  cin: ['Common Application Form (CAF)', 'MCA Incorporation Verification'],
  project_name: ['Common Application Form (CAF)', 'Single Window Proposals', 'All Approvals'],
  plot_number: ['MIDC Land Allotment', 'MPCB Consent', 'Factory Inspectorate (DISH)', 'Fire NOC'],
  plot_area_sqm: ['MIDC Land Allotment', 'MPCB CTE / CTO', 'Fire Safety Layout', 'Factory Plan Approval'],
  built_up_area_sqm: ['Building Plan Approval', 'Fire Safety Layout', 'Factory Inspectorate (DISH)'],
  district: ['Jurisdictional Authority Assignment', 'DIC Registration', 'MPCB Regional Office'],
  industrial_area: ['MIDC Regional Office', 'Infrastructure Connections'],
  registered_address: ['Statutory Notices', 'Establishment Registration', 'CAF Profile'],
  worker_count: ['Factory License (DISH)', 'Labour Welfare Fund', 'EPFO/ESIC Registration'],
  power_demand_kva: ['MSEDCL Electricity Connection', 'Infrastructure Clearance'],
  water_demand_kld: ['MIDC Water Connection', 'MPCB Consent to Establish (ETP Assessment)'],
  pollution_category: ['MPCB Classification (Red/Orange/Green/White)', 'SLA Processing Window'],
  document_date: ['Statutory Validity Check', 'Compliance Calendar'],
  expiry_date: ['Renewals & Compliance Tracker', 'Automated Expiry Alerts'],
  reference_number: ['Department Scrutiny Tracking', 'Historical Cross-Referencing'],
};

/**
 * Checks whether two values represent a material discrepancy.
 */
function valuesConflict(valA: string | number, valB: string | number, key: string): boolean {
  if (typeof valA === 'number' && typeof valB === 'number') {
    // 2.0% statutory tolerance for area or numeric values
    const maxVal = Math.max(Math.abs(valA), Math.abs(valB));
    if (maxVal === 0) return false;
    const diffPct = (Math.abs(valA - valB) / maxVal) * 100;
    return diffPct > 2.0;
  }

  // String comparison
  const strA = String(valA).toLowerCase().replace(/[^a-z0-9]/g, '');
  const strB = String(valB).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!strA || !strB) return false;

  return strA !== strB && !strA.includes(strB) && !strB.includes(strA);
}

/**
 * Loads aggregated details across all project documents with conflict detection and master overrides.
 */
export async function getDocumentDetailCentre(projectId: string): Promise<DocumentDetailCentrePayload> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: true, attributes: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  const docs = await prisma.document.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'desc' },
  });

  // Load master overrides stored in ProjectAttribute
  const overrideAttr = project.attributes?.find((a: any) => a.key === 'doc_master_overrides');
  let overrides: Record<string, { value: any; overridden_at: string; actor_id?: string; note?: string }> = {};
  if (overrideAttr) {
    try {
      overrides = JSON.parse(overrideAttr.value);
    } catch {}
  }

  // Gather extractions from all documents
  const documentExtractions = await Promise.all(
    docs.map(async (doc) => {
      try {
        const ext = await getDocumentExtraction(doc.id);
        return { doc, ext };
      } catch {
        return { doc, ext: null };
      }
    })
  );

  // Group occurrences by field key
  const occurrencesByKey = new Map<string, FieldSourceOccurrence[]>();
  for (const { doc, ext } of documentExtractions) {
    if (!ext || !ext.fields) continue;
    for (const [key, rawRecord] of Object.entries(ext.fields)) {
      const fieldRecord = rawRecord as ExtractedFieldRecord;
      if (fieldRecord.value !== undefined && fieldRecord.value !== null && fieldRecord.value !== '') {
        if (!occurrencesByKey.has(key)) {
          occurrencesByKey.set(key, []);
        }
        occurrencesByKey.get(key)!.push({
          document_id: doc.id,
          document_name: doc.file_name,
          document_type: doc.document_type,
          extracted_value: fieldRecord.value,
          extracted_at: fieldRecord.extracted_at,
          status: fieldRecord.status,
        });
      }
    }
  }

  const categoryBuckets: Record<string, AggregatedFieldDetail[]> = {
    Identity: [],
    Project: [],
    Site: [],
    Utilities: [],
    Dates: [],
    References: [],
  };

  let totalConflicts = 0;
  let totalExtractedFieldCount = 0;
  let confirmedCount = 0;

  for (const def of FIELD_DEFINITIONS) {
    const occurrences = occurrencesByKey.get(def.key) || [];
    totalExtractedFieldCount += occurrences.length;

    // Detect conflict across distinct source documents
    let hasConflict = false;
    let conflictSummary: string | undefined;

    if (occurrences.length > 1) {
      for (let i = 0; i < occurrences.length; i++) {
        for (let j = i + 1; j < occurrences.length; j++) {
          if (valuesConflict(occurrences[i].extracted_value, occurrences[j].extracted_value, def.key)) {
            hasConflict = true;
            conflictSummary = `Conflict detected: "${occurrences[i].document_name}" (${occurrences[i].extracted_value}) vs "${occurrences[j].document_name}" (${occurrences[j].extracted_value})`;
            totalConflicts++;
            break;
          }
        }
        if (hasConflict) break;
      }
    }

    // Determine master value and provenance
    const userOverride = overrides[def.key];
    let masterValue: string | number | null = null;
    let provenance = 'Not Available';
    let isOverridden = false;
    let lastUpdated = project.created_at ? new Date(project.created_at).toISOString() : new Date().toISOString();

    if (userOverride && userOverride.value !== undefined) {
      masterValue = userOverride.value;
      provenance = 'User Override / Manually Confirmed';
      isOverridden = true;
      confirmedCount++;
      lastUpdated = userOverride.overridden_at || lastUpdated;
    } else if (hasConflict) {
      masterValue = occurrences[0]?.extracted_value ?? null;
      provenance = 'Needs Review — Source Documents Disagree';
      lastUpdated = occurrences[0]?.extracted_at || lastUpdated;
    } else if (occurrences.length > 0) {
      masterValue = occurrences[0].extracted_value;
      provenance = occurrences.length > 1
        ? `Verified Consistent across ${occurrences.length} Documents`
        : `Extracted from ${occurrences[0].document_name}`;
      lastUpdated = occurrences[0].extracted_at;
    } else {
      // Fallback baseline from project or organization if already seeded
      if (def.key === 'legal_name') masterValue = project.organization?.legal_name ?? null;
      else if (def.key === 'pan') masterValue = project.organization?.pan ?? null;
      else if (def.key === 'gstin') masterValue = project.organization?.gstin ?? null;
      else if (def.key === 'cin') masterValue = project.organization?.cin ?? null;
      else if (def.key === 'project_name') masterValue = project.name;
      else if (def.key === 'district') masterValue = project.district;
      else if (def.key === 'industrial_area') masterValue = project.industrial_area;
      else if (def.key === 'worker_count') masterValue = project.employee_count;

      if (masterValue) {
        provenance = 'Project Profile Baseline';
      }
    }

    const fieldDetail: AggregatedFieldDetail = {
      key: def.key,
      label: def.label,
      category: def.category,
      master_value: masterValue,
      original_extracted_values: occurrences,
      has_conflict: hasConflict,
      conflict_summary: conflictSummary,
      is_overridden: isOverridden,
      provenance,
      downstream_targets: DOWNSTREAM_REUSE_MAP[def.key] || ['Common Application Form (CAF)'],
      overridden_at: userOverride?.overridden_at,
      override_actor: userOverride?.actor_id,
      override_note: userOverride?.note,
      last_updated: lastUpdated,
    };

    if (categoryBuckets[def.category]) {
      categoryBuckets[def.category].push(fieldDetail);
    }
  }

  return {
    project_id: projectId,
    project_name: project.name,
    summary: {
      total_documents: docs.length,
      total_fields_extracted: totalExtractedFieldCount,
      conflicts_detected: totalConflicts,
      user_confirmed_fields: confirmedCount,
    },
    categories: categoryBuckets as any,
  };
}

/**
 * Updates a master field value with user confirmation / override,
 * records audit provenance, and automatically synchronizes to all downstream workflows.
 */
export async function updateMasterField(
  projectId: string,
  fieldKey: string,
  newValue: string | number,
  actorId?: string,
  note?: string
): Promise<DocumentDetailCentrePayload> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: true, attributes: true },
  });
  if (!project) throw new NotFoundError('Project not found');

  // Load existing overrides
  const overrideAttr = project.attributes?.find((a: any) => a.key === 'doc_master_overrides');
  let overrides: Record<string, { value: any; overridden_at: string; actor_id?: string; note?: string }> = {};
  if (overrideAttr) {
    try {
      overrides = JSON.parse(overrideAttr.value);
    } catch {}
  }

  const previousValue = overrides[fieldKey]?.value;
  const now = new Date().toISOString();

  overrides[fieldKey] = {
    value: newValue,
    overridden_at: now,
    actor_id: actorId,
    note: note || 'Manually confirmed in Document Detail Centre',
  };

  // 1. Save master override in ProjectAttribute
  await prisma.projectAttribute.upsert({
    where: { project_id_key: { project_id: projectId, key: 'doc_master_overrides' } },
    update: { value: JSON.stringify(overrides) },
    create: { project_id: projectId, key: 'doc_master_overrides', value: JSON.stringify(overrides) },
  });

  // 2. Automatic downstream reuse synchronization
  // Update ProjectAttribute so Common Application Form & rule engines get the verified value
  const attrKeyMap: Record<string, string> = {
    plot_area_sqm: 'land_area_sqm',
    power_demand_kva: 'power_requirement_kva',
    water_demand_kld: 'water_usage_kld',
    pollution_category: 'pollution_category',
  };

  if (attrKeyMap[fieldKey]) {
    const attrKey = attrKeyMap[fieldKey];
    await prisma.projectAttribute.upsert({
      where: { project_id_key: { project_id: projectId, key: attrKey } },
      update: { value: String(newValue) },
      create: { project_id: projectId, key: attrKey, value: String(newValue) },
    });
  }

  // Update Organization core fields
  if (project.org_id) {
    const orgUpdates: Record<string, any> = {};
    if (fieldKey === 'legal_name') orgUpdates.legal_name = String(newValue);
    if (fieldKey === 'pan') orgUpdates.pan = String(newValue);
    if (fieldKey === 'gstin') orgUpdates.gstin = String(newValue);
    if (fieldKey === 'cin') orgUpdates.cin = String(newValue);
    if (fieldKey === 'registered_address') orgUpdates.registered_address = String(newValue);

    if (Object.keys(orgUpdates).length > 0) {
      await prisma.organization.update({
        where: { id: project.org_id },
        data: orgUpdates,
      });
    }
  }

  // Update Project core fields
  const projectUpdates: Record<string, any> = {};
  if (fieldKey === 'project_name') projectUpdates.name = String(newValue);
  if (fieldKey === 'district') projectUpdates.district = String(newValue);
  if (fieldKey === 'industrial_area') projectUpdates.industrial_area = String(newValue);
  if (fieldKey === 'worker_count') projectUpdates.employee_count = Number(newValue);

  if (Object.keys(projectUpdates).length > 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: projectUpdates,
    });
  }

  // 3. Record Audit Log for regulatory trace
  await recordAudit({
    actor_id: actorId,
    action: 'MASTER_DOCUMENT_FIELD_OVERRIDE',
    entity_type: 'Project',
    entity_id: projectId,
    before_data: { field_key: fieldKey, value: previousValue },
    after_data: { field_key: fieldKey, value: newValue, note },
    metadata: {
      provenance: 'User Override / Manually Confirmed',
      timestamp: now,
    },
  });

  return getDocumentDetailCentre(projectId);
}
