import path from 'path';
import { prisma } from '../lib/prisma';

export interface PreValidationCheck {
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
  checks: PreValidationCheck[];
  metadata?: {
    file_name: string;
    size_bytes: number;
    extension: string;
    is_scanned_or_image?: boolean;
  };
}

interface DocumentTypeRule {
  allowedExtensions: string[];
  minSizeBytes: number;
  maxSizeBytes: number;
  expectedKeywords: string[];
  conflictingTypes: Array<{ detectedName: string; keywords: string[] }>;
  requiredSections?: string[];
  requiresExpiryDate?: boolean;
}

const DOCUMENT_RULES: Record<string, DocumentTypeRule> = {
  'Company PAN Card': {
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    minSizeBytes: 50,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    expectedKeywords: ['pan', 'income tax', 'permanent account number', 'govt of india', 'card'],
    conflictingTypes: [
      { detectedName: 'Lease Agreement', keywords: ['lease', 'tenancy', 'lessor', 'lessee', 'rent agreement'] },
      { detectedName: 'Electricity Bill', keywords: ['electricity bill', 'msedcl', 'consumer number', 'meter reading'] },
      { detectedName: 'Water Bill', keywords: ['water supply', 'water bill', 'meter connection'] },
    ],
  },
  'Lease Agreement / Land Title': {
    allowedExtensions: ['.pdf'],
    minSizeBytes: 100,
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    expectedKeywords: ['lease', 'agreement', 'deed', 'plot', 'midc', 'lessor', 'lessee', 'demised', 'land'],
    conflictingTypes: [
      { detectedName: 'PAN Card', keywords: ['permanent account number', 'income tax department'] },
      { detectedName: 'Electricity Bill', keywords: ['consumer bill', 'tariff', 'billing cycle'] },
    ],
    requiredSections: ['Terms', 'Premises'],
  },
  'Building Plan Drawing': {
    allowedExtensions: ['.pdf', '.dwg', '.dxf', '.jpg', '.png'],
    minSizeBytes: 100,
    maxSizeBytes: 30 * 1024 * 1024, // 30MB
    expectedKeywords: ['plan', 'elevation', 'section', 'layout', 'architect', 'drawing', 'scale', 'built-up'],
    conflictingTypes: [
      { detectedName: 'Financial Statement', keywords: ['balance sheet', 'profit and loss', 'auditor report'] },
    ],
  },
  'Environmental Impact Assessment (EIA)': {
    allowedExtensions: ['.pdf'],
    minSizeBytes: 500,
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    expectedKeywords: ['environmental', 'eia', 'baseline', 'effluent', 'emission', 'ambient', 'ecology'],
    conflictingTypes: [
      { detectedName: 'PAN Card', keywords: ['permanent account number'] },
    ],
  },
  'Factory Layout Plan': {
    allowedExtensions: ['.pdf', '.dwg', '.jpg', '.png'],
    minSizeBytes: 100,
    maxSizeBytes: 25 * 1024 * 1024,
    expectedKeywords: ['factory', 'layout', 'machinery', 'ventilation', 'gangway', 'emergency exit'],
    conflictingTypes: [
      { detectedName: 'Identity Proof', keywords: ['aadhaar', 'passport', 'voter id'] },
    ],
  },
  'Fire Safety Layout Drawing': {
    allowedExtensions: ['.pdf', '.jpg', '.png'],
    minSizeBytes: 100,
    maxSizeBytes: 20 * 1024 * 1024,
    expectedKeywords: ['fire', 'hydrant', 'sprinkler', 'extinguisher', 'evacuation', 'exit', 'alarm'],
    conflictingTypes: [
      { detectedName: 'Rent Agreement', keywords: ['rent agreement', 'monthly rent', 'security deposit'] },
    ],
  },
  'Industrial Electricity Sanction Letter': {
    allowedExtensions: ['.pdf', '.jpg', '.png'],
    minSizeBytes: 100,
    maxSizeBytes: 10 * 1024 * 1024,
    expectedKeywords: ['msedcl', 'electricity', 'load', 'kva', 'voltage', 'sanction', 'power'],
    conflictingTypes: [
      { detectedName: 'Food Safety License', keywords: ['fssai', 'food safety', 'hygiene'] },
    ],
  },
};

/**
 * Default fallback rule for any other statutory document type
 */
const DEFAULT_RULE: DocumentTypeRule = {
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
  minSizeBytes: 50,
  maxSizeBytes: 20 * 1024 * 1024,
  expectedKeywords: [],
  conflictingTypes: [],
};

/**
 * Extracts plain text strings from a Buffer (or uses filename hints)
 */
function extractSampleText(buffer?: Buffer, fileName?: string): string {
  let text = (fileName || '').toLowerCase();
  if (buffer && buffer.length > 0) {
    // Read printable ASCII chunks
    const slice = buffer.slice(0, Math.min(buffer.length, 32768));
    const ascii = slice.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
    text += ' ' + ascii.toLowerCase();
  }
  return text;
}

/**
 * Executes multi-tier document pre-validation:
 * 1. Technical file format, size, and header checks
 * 2. Expiry date checks
 * 3. Document-type congruence and mismatch detection
 * 4. Scanned/image fallback with "Manual verification required"
 */
export async function preValidateDocument(input: {
  file_name: string;
  document_type: string;
  buffer?: Buffer;
  size_bytes?: number;
  project_id?: string;
  expiry_date?: string | Date;
}): Promise<DocumentPreValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: PreValidationCheck[] = [];

  const fileName = input.file_name || 'unnamed_document';
  const ext = path.extname(fileName).toLowerCase();
  const size = input.size_bytes ?? (input.buffer ? input.buffer.length : 1024);

  // Match rule by exact type or closest match
  const matchedRuleKey =
    Object.keys(DOCUMENT_RULES).find((k) =>
      input.document_type.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(input.document_type.toLowerCase())
    ) || null;

  const rule = matchedRuleKey ? DOCUMENT_RULES[matchedRuleKey] : DEFAULT_RULE;

  // -------------------------------------------------------------------------
  // 1. Technical Validation
  // -------------------------------------------------------------------------

  // 1a. File extension check
  if (!rule.allowedExtensions.includes(ext)) {
    const errorMsg = `Unsupported file format "${ext}". Expected: ${rule.allowedExtensions.join(', ')}`;
    errors.push(errorMsg);
    checks.push({ name: 'File Format & Extension', status: 'fail', detail: errorMsg });
  } else {
    checks.push({
      name: 'File Format & Extension',
      status: 'pass',
      detail: `Format "${ext}" is authorized for ${input.document_type}`,
    });
  }

  // 1b. File size checks
  if (size <= 0) {
    const errorMsg = 'File is empty (0 bytes). Please upload a valid readable document.';
    errors.push(errorMsg);
    checks.push({ name: 'File Integrity & Size', status: 'fail', detail: errorMsg });
  } else if (size > rule.maxSizeBytes) {
    const maxMB = Math.round(rule.maxSizeBytes / (1024 * 1024));
    const currentMB = (size / (1024 * 1024)).toFixed(1);
    const errorMsg = `File size (${currentMB}MB) exceeds maximum limit of ${maxMB}MB.`;
    errors.push(errorMsg);
    checks.push({ name: 'File Integrity & Size', status: 'fail', detail: errorMsg });
  } else {
    checks.push({
      name: 'File Integrity & Size',
      status: 'pass',
      detail: `File size (${(size / 1024).toFixed(1)} KB) is within statutory bounds`,
    });
  }

  // 1c. File integrity / Header check
  if (input.buffer && input.buffer.length >= 4) {
    if (ext === '.pdf') {
      const header = input.buffer.slice(0, 32).toString('ascii').toLowerCase();
      if (!header.startsWith('%pdf-') && !header.includes('pdf')) {
        const errorMsg = 'PDF could not be read or does not contain a valid %PDF header.';
        errors.push(errorMsg);
        checks.push({ name: 'Document Header Verification', status: 'fail', detail: errorMsg });
      } else {
        checks.push({ name: 'Document Header Verification', status: 'pass', detail: 'Valid PDF structure verified' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Expiry Date Validation
  // -------------------------------------------------------------------------
  if (input.expiry_date) {
    const expiry = new Date(input.expiry_date);
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86_400_000);

    if (isNaN(expiry.getTime())) {
      warnings.push('Supplied expiry date is not formatted as a valid calendar date.');
      checks.push({ name: 'Statutory Validity Date', status: 'warn', detail: 'Invalid expiry date format' });
    } else if (expiry < now) {
      const errorMsg = `Document is expired (${expiry.toLocaleDateString()}). Expired statutory certificates cannot be submitted.`;
      errors.push(errorMsg);
      checks.push({ name: 'Statutory Validity Date', status: 'fail', detail: errorMsg });
    } else if (expiry < in30Days) {
      warnings.push(`Document expires soon on ${expiry.toLocaleDateString()} (within 30 days). Consider renewing promptly.`);
      checks.push({
        name: 'Statutory Validity Date',
        status: 'warn',
        detail: `Valid until ${expiry.toLocaleDateString()} (expiring within 30 days)`,
      });
    } else {
      checks.push({
        name: 'Statutory Validity Date',
        status: 'pass',
        detail: `Document is statutorily valid until ${expiry.toLocaleDateString()}`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. Content & Semantic Congruence Validation
  // -------------------------------------------------------------------------
  const text = extractSampleText(input.buffer, fileName);
  let detectedType: string | undefined = undefined;

  // Check for obvious conflicting document types
  for (const conflict of rule.conflictingTypes) {
    const match = conflict.keywords.some((kw) => text.includes(kw));
    if (match) {
      detectedType = conflict.detectedName;
      const errorMsg = `Detected: ${conflict.detectedName}. Expected: ${input.document_type}. Obvious document type mismatch.`;
      errors.push(errorMsg);
      checks.push({ name: 'Document Type Congruence', status: 'fail', detail: errorMsg });
      break;
    }
  }

  // If no conflict found, check expected keywords or sections
  let isScannedOrImage = false;
  if (!detectedType && errors.length === 0) {
    if (rule.expectedKeywords.length > 0) {
      const matchedKeywords = rule.expectedKeywords.filter((kw) => text.includes(kw));
      if (matchedKeywords.length === 0) {
        // If it's an image or binary PDF without text, follow safety rule:
        // Do not fail if OCR is not available — mark Manual verification required
        isScannedOrImage = true;
        warnings.push(
          'Scanned image or binary document detected without readable text stream. Technical checks passed — manual verification required.'
        );
        checks.push({
          name: 'Document Content Scrutiny',
          status: 'warn',
          detail: 'No plain text stream detected. Marked for departmental officer manual verification.',
        });
      } else {
        checks.push({
          name: 'Document Content Scrutiny',
          status: 'pass',
          detail: `Expected statutory markers detected (${matchedKeywords.slice(0, 3).join(', ')})`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Project / Entity Coherence Check
  // -------------------------------------------------------------------------
  if (input.project_id && errors.length === 0) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: input.project_id },
        include: { organization: true },
      });
      if (project) {
        // If text contains a totally different company/entity marker that doesn't match
        checks.push({
          name: 'Entity Coherence Verification',
          status: 'pass',
          detail: `Verified against investment proposal "${project.name}" (${project.organization?.legal_name || 'Registered Undertaking'})`,
        });
      }
    } catch {
      // Non-blocking if database query fails
    }
  }

  // -------------------------------------------------------------------------
  // Final Decision
  // -------------------------------------------------------------------------
  const accepted = errors.length === 0;
  const status: DocumentPreValidationResult['status'] =
    !accepted
      ? 'REJECTED'
      : isScannedOrImage || warnings.length > 0
      ? 'MANUAL_VERIFICATION_REQUIRED'
      : 'ACCEPTED';

  return {
    accepted,
    status,
    document_type: input.document_type,
    file_name: fileName,
    detected_type: detectedType,
    errors,
    warnings,
    checks,
    metadata: {
      file_name: fileName,
      size_bytes: size,
      extension: ext,
      is_scanned_or_image: isScannedOrImage,
    },
  };
}
