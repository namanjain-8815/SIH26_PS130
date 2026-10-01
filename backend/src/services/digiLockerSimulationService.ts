import { prisma } from '../lib/prisma';
import { NotFoundError, BadRequestError } from '../lib/errors';

/**
 * P1.X — DigiLocker Verification — Prototype Simulation Seam
 * 
 * IMPORTANT:
 * - Zero live external integrations or API Setu credentials.
 * - Zero external API keys.
 * - Demonstrates the future production workflow of consent-based verified
 *   credentials while keeping the SIH prototype self-contained and fully functional.
 */

export interface DigiLockerProviderSeam {
  isLive: false;
  providerName: 'digilocker_simulated_prototype';
  simulateVerification(params: { projectId: string; userId: string }): Promise<DigiLockerSimulationResult>;
  // Future production OAuth2 & API Setu gateway method contracts:
  initiateOAuthConsent?(redirectUri: string): Promise<{ consentUrl: string }>;
  fetchIssuedDocument?(docType: string, uri: string): Promise<Buffer>;
}

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

const PROTOTYPE_NOTICE =
  'Prototype Notice: This is a simulated integration using demonstration data. No live DigiLocker or API Setu connection is active. Production integration would require authorized partner onboarding, explicit user consent, API credentials, security validation and approved DigiLocker integration.\nDigiLocker connection using API Setu is future integration.';

function getAvailableDigiLockerDocuments(orgName: string, pan: string, cin: string): {
  company_documents: DigiLockerDocumentItem[];
  user_documents: DigiLockerDocumentItem[];
} {
  return {
    company_documents: [
      {
        id: 'dgl-pan-01',
        name: 'Company PAN Verification Record',
        category: 'COMPANY',
        issuer: 'Income Tax Department (CBDT)',
        certificate_number: pan,
        issued_on: '15/04/2021',
        format: 'Digital Verifiable XML / PDF',
        vault_document_type: 'Company PAN Card',
        is_in_vault: true,
        can_reuse_in_caf: true,
        reusable_fields: ['pan', 'legal_name', 'entity_type'],
      },
      {
        id: 'dgl-mca-02',
        name: 'Certificate of Incorporation & MoA',
        category: 'COMPANY',
        issuer: 'Ministry of Corporate Affairs (ROC Mumbai)',
        certificate_number: cin,
        issued_on: '22/05/2021',
        format: 'e-Certificate (MCA21)',
        vault_document_type: 'Memorandum of Association (MoA)',
        is_in_vault: true,
        can_reuse_in_caf: true,
        reusable_fields: ['cin', 'incorporation_date', 'registered_office_address'],
      },
      {
        id: 'dgl-midc-03',
        name: 'MIDC Plot Allotment Letter & Lease Deed',
        category: 'COMPANY',
        issuer: 'Maharashtra Industrial Development Corporation (MIDC)',
        certificate_number: 'MIDC/BHOSARI/PLOT-42/2021',
        issued_on: '10/08/2021',
        format: 'DigiLocker Issued Document',
        vault_document_type: 'Land Ownership / Lease Agreement',
        is_in_vault: true,
        can_reuse_in_caf: true,
        reusable_fields: ['industrial_area', 'plot_no', 'district', 'land_area_sqm'],
      },
      {
        id: 'dgl-msme-04',
        name: 'Udyam MSME Registration Certificate',
        category: 'COMPANY',
        issuer: 'Ministry of Micro, Small and Medium Enterprises',
        certificate_number: 'UDYAM-MH-26-0038912',
        issued_on: '05/09/2021',
        format: 'National MSME e-Certificate',
        vault_document_type: 'Udyam Registration Certificate',
        is_in_vault: true,
        can_reuse_in_caf: true,
        reusable_fields: ['enterprise_category', 'major_activity_nic'],
      },
    ],
    user_documents: [
      {
        id: 'dgl-kyc-05',
        name: 'Authorized Signatory Aadhaar e-KYC',
        category: 'USER',
        issuer: 'Unique Identification Authority of India (UIDAI Demo)',
        certificate_number: 'XXXX-XXXX-4921',
        issued_on: '12/03/2022',
        format: 'e-KYC Consent Token',
        vault_document_type: 'Authorized Signatory Identity Proof',
        is_in_vault: true,
        can_reuse_in_caf: true,
        reusable_fields: ['signatory_name', 'signatory_mobile', 'signatory_email'],
      },
      {
        id: 'dgl-br-06',
        name: 'Certified Board Resolution for Signatory',
        category: 'USER',
        issuer: `${orgName} Board of Directors`,
        certificate_number: 'BR-2021-04-AUTH',
        issued_on: '28/05/2021',
        format: 'Digitally Signed Document',
        vault_document_type: 'Board Resolution for Authorized Signatory',
        is_in_vault: true,
        can_reuse_in_caf: true,
        reusable_fields: ['signing_power_scope', 'board_resolution_date'],
      },
    ],
  };
}

/**
 * Returns current simulated DigiLocker verification status for a project proposal.
 */
export async function getDigiLockerSimulationStatus(projectId: string): Promise<DigiLockerSimulationResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: true,
      documents: true,
      project_approvals: {
        include: { application: true },
      },
    },
  });

  if (!project) throw new NotFoundError('Project proposal not found');

  const org = project.organization;
  const docs = project.documents || [];

  // Check if simulation was explicitly executed via audit log
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      entity_id: projectId,
      action: 'DIGILOCKER_SIMULATION_VERIFIED',
    },
  });

  const isConnected = !!auditEntry;

  const panValue = org?.pan || 'AABCA1234F';
  const orgName = org?.legal_name || 'ABC Foods Pvt Ltd';
  const cinValue = org?.cin || 'U15132MH2021PTC368912';

  const activeApplications = (project.project_approvals || []).filter(
    (pa: any) => pa.application !== null
  ).length;

  const availableDocs = getAvailableDigiLockerDocuments(orgName, panValue, cinValue);

  return {
    is_connected: isConnected,
    simulation: true,
    simulated_at: auditEntry ? (auditEntry.timestamp as any).toISOString?.() || new Date().toISOString() : new Date().toISOString(),
    project_id: project.id,
    project_name: project.name,
    credentials: {
      pan: {
        identifier: 'PAN',
        label: 'Permanent Account Number (PAN)',
        value: panValue,
        status: isConnected ? 'VERIFIED' : 'PENDING',
        issuer: 'Income Tax Department (Demo)',
        verified_at: isConnected ? new Date().toISOString() : undefined,
      },
      organization: {
        identifier: 'LEGAL_NAME',
        label: 'Applicant / Legal Entity',
        value: orgName,
        status: isConnected ? 'VERIFIED' : 'PENDING',
        issuer: 'Ministry of Corporate Affairs (Demo)',
        verified_at: isConnected ? new Date().toISOString() : undefined,
      },
      cin: {
        identifier: 'CIN',
        label: 'Corporate Identity Number',
        value: cinValue,
        status: isConnected ? 'VERIFIED' : 'PENDING',
        issuer: 'Ministry of Corporate Affairs (Demo)',
        verified_at: isConnected ? new Date().toISOString() : undefined,
      },
      signatory: {
        identifier: 'AUTHORIZED_SIGNATORY',
        label: 'Authorized Signatory',
        value: 'Rajesh Mehta (Managing Director)',
        status: isConnected ? 'VERIFIED' : 'PENDING',
        issuer: 'UIDAI & Board Resolution (Demo)',
        verified_at: isConnected ? new Date().toISOString() : undefined,
      },
    },
    available_documents: availableDocs,
    linked_vault_documents: docs
      .filter((d: any) =>
        ['Company PAN Card', 'Memorandum of Association (MoA)', 'Land Ownership / Lease Agreement'].includes(
          d.document_type
        )
      )
      .map((d: any) => ({
        id: d.id,
        document_type: d.document_type,
        file_name: d.file_name,
        verification_status: isConnected ? 'VERIFIED' : d.verification_status,
      })),
    reusable_form_fields: [
      { field_key: 'pan', label: 'Company PAN', value: panValue, target_form: 'Common Application Form' },
      { field_key: 'cin', label: 'Corporate Identity No (CIN)', value: cinValue, target_form: 'Common Application Form' },
      { field_key: 'legal_name', label: 'Legal Entity Name', value: orgName, target_form: 'Common Application Form' },
      { field_key: 'signatory_name', label: 'Authorized Signatory', value: 'Rajesh Mehta', target_form: 'Signatory Declaration' },
      { field_key: 'signatory_designation', label: 'Designation', value: 'Managing Director', target_form: 'Signatory Declaration' },
      { field_key: 'registered_address', label: 'MIDC Industrial Plot', value: 'Plot No. 42, MIDC Bhosari, Pune - 411026', target_form: 'Site Plan & MIDC Clearance' },
    ],
    data_reuse_summary: {
      master_profile_fields_synced: 6,
      vault_documents_verified: isConnected ? 4 : 0,
      applications_benefited: activeApplications > 0 ? activeApplications : 6,
    },
    disclaimer: PROTOTYPE_NOTICE,
  };
}

/**
 * Executes the simulated consent-based DigiLocker verification flow.
 * - Updates linked vault documents to VERIFIED
 * - Records an explainable audit log entry
 * - Creates a user notification
 * - Returns verified demonstration credential package
 */
export async function executeDigiLockerSimulation(
  projectId: string,
  userId: string
): Promise<DigiLockerSimulationResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: true,
      documents: true,
      project_approvals: {
        include: { application: true },
      },
    },
  });

  if (!project) throw new NotFoundError('Project proposal not found');

  const docs = project.documents || [];

  // Update vault documents matching PAN or MoA to VERIFIED
  const targetDocs = docs.filter((d: any) =>
    ['Company PAN Card', 'Memorandum of Association (MoA)', 'Land Ownership / Lease Agreement'].includes(d.document_type)
  );

  for (const doc of targetDocs) {
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        verification_status: 'VERIFIED',
      },
    });
  }

  // Record audit log entry
  try {
    await prisma.auditLog.create({
      data: {
        actor_id: userId,
        action: 'DIGILOCKER_SIMULATION_VERIFIED',
        entity_type: 'Project',
        entity_id: projectId,
        timestamp: new Date(),
        metadata: {
          simulated: true,
          provider: 'DigiLocker (Prototype Simulation)',
          verified_credentials: ['PAN', 'CIN', 'LEGAL_NAME', 'AUTHORIZED_SIGNATORY'],
          notice: PROTOTYPE_NOTICE,
        },
      },
    });
  } catch {
    // Non-blocking for audit log
  }

  // Create notification for applicant
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: 'DigiLocker Verification Simulation Complete',
        message:
          'Demonstration credentials (PAN: AABCA1234F, ABC Foods Pvt Ltd) and 4 enterprise documents have been retrieved and linked to your Document Vault.',
        type: 'INFO',
        read: false,
      },
    });
  } catch {
    // Non-blocking for notification
  }

  return getDigiLockerSimulationStatus(projectId);
}

/**
 * Resets the DigiLocker simulation back to the unconnected state.
 */
export async function resetDigiLockerSimulation(projectId: string): Promise<DigiLockerSimulationResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new NotFoundError('Project proposal not found');

  // Remove the verification audit log to return to unconnected state
  try {
    await prisma.auditLog.deleteMany({
      where: {
        entity_id: projectId,
        action: 'DIGILOCKER_SIMULATION_VERIFIED',
      },
    });
  } catch {
    // Non-blocking
  }

  return getDigiLockerSimulationStatus(projectId);
}
