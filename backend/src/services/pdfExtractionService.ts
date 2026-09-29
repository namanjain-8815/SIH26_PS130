// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;


export interface ExtractedFieldRecord {
  key: string;
  label: string;
  category: 'Identity' | 'Project' | 'Site' | 'Utilities' | 'Dates' | 'References';
  value: string | number;
  raw_value: string;
  status: 'EXTRACTED' | 'MANUAL_VERIFICATION_REQUIRED' | 'NOT_FOUND';
  extracted_at: string;
  confidence?: number;
}

export interface DocumentExtractionResult {
  document_id: string;
  document_type?: string;
  file_name?: string;
  is_readable: boolean;
  page_count: number;
  status: 'EXTRACTED' | 'MANUAL_VERIFICATION_REQUIRED' | 'EMPTY_DOCUMENT';
  extracted_at: string;
  field_count: number;
  fields: Record<string, ExtractedFieldRecord>;
  raw_text_preview?: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  category: 'Identity' | 'Project' | 'Site' | 'Utilities' | 'Dates' | 'References';
  patterns: RegExp[];
  transform?: (raw: string) => string | number;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // ── Identity ─────────────────────────────────────────────────────────────
  {
    key: 'legal_name',
    label: 'Legal Entity Name',
    category: 'Identity',
    patterns: [
      /(?:Legal Entity Name|Name of Entity|Name of Company|Company Name|Applicant Name)\s*[:\-]?\s*([^\n\r]+)/i,
      /(?:Applicant)\s*[:\-]?\s*(?![\s/]*Entity)([^\n\r]+)/i,
      /(?:M\/s\.?)\s+([^\n\r,]+)/i,
    ],
    transform: (v) => v.trim().replace(/^[:\-\s]+/, ''),
  },
  {
    key: 'cin',
    label: 'Corporate Identity Number (CIN)',
    category: 'Identity',
    patterns: [
      /\b([LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6})\b/,
      /(?:Corporate Identity Number|\bCIN\b)\s*[:\-\(]*\s*([A-Za-z0-9]+)/i,
    ],
    transform: (v) => v.trim().toUpperCase(),
  },
  {
    key: 'pan',
    label: 'Permanent Account Number (PAN)',
    category: 'Identity',
    patterns: [
      /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/,
      /(?:Permanent Account Number|\bPAN\b)\s*[:\-]?\s*([A-Z0-9]+)/i,
    ],
    transform: (v) => v.trim().toUpperCase(),
  },
  {
    key: 'gstin',
    label: 'GSTIN',
    category: 'Identity',
    patterns: [
      /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/,
      /(?:GSTIN|GST Number)\s*[:\-]?\s*([0-9A-Za-z]+)/i,
    ],
    transform: (v) => v.trim().toUpperCase(),
  },

  // ── Project ──────────────────────────────────────────────────────────────
  {
    key: 'project_name',
    label: 'Project Name',
    category: 'Project',
    patterns: [
      /(?:Project Name|Consumer \/ Project|Name of Factory|Factory Name)\s*[:\-]?\s*([^\n\r]+)/i,
    ],
    transform: (v) => v.trim().replace(/^[:\-\s]+/, ''),
  },

  // ── Site / Land ──────────────────────────────────────────────────────────
  {
    key: 'plot_number',
    label: 'Plot Number',
    category: 'Site',
    patterns: [
      /(?:Plot Number|Plot No\.?|Survey Number|Survey No\.?|Gat No\.?)\s*[:\-]?\s*([^\n\r,]+)/i,
      /\bPlot\s+(?:No\.?\s*)?([0-9A-Za-z\/\-]+)\b/i,
    ],
    transform: (v) => v.trim().replace(/^[:\-\s]+/, ''),
  },
  {
    key: 'plot_area_sqm',
    label: 'Plot / Site Area',
    category: 'Site',
    patterns: [
      /(?:Plot \/ Site Area|Plot Area|Site Area|Land Area|Total Plot Area)\s*[:\-]?\s*([0-9,.]+)\s*(?:sq\.?\s*m|sqm|square\s*met)?/i,
    ],
    transform: (v) => {
      const parsed = parseFloat(v.replace(/,/g, ''));
      return isNaN(parsed) ? v.trim() : parsed;
    },
  },
  {
    key: 'built_up_area_sqm',
    label: 'Built-up Area',
    category: 'Site',
    patterns: [
      /(?:Built-up Area|Builtup Area|Constructed Area|Proposed Built-up)\s*[:\-]?\s*([0-9,.]+)\s*(?:sq\.?\s*m|sqm|square\s*met)?/i,
    ],
    transform: (v) => {
      const parsed = parseFloat(v.replace(/,/g, ''));
      return isNaN(parsed) ? v.trim() : parsed;
    },
  },
  {
    key: 'district',
    label: 'District',
    category: 'Site',
    patterns: [
      /(?:District|Revenue District)\s*[:\-]?\s*([A-Za-z\s]+?)(?:\s*(?:Industrial|Maharashtra|Pune|Agreement|Plot|\n|\r|$))/i,
      /\bDistrict\s*[:\-]?\s*([A-Za-z\s]+)/i,
    ],
    transform: (v) => v.trim(),
  },
  {
    key: 'industrial_area',
    label: 'Industrial Area',
    category: 'Site',
    patterns: [
      /(?:Industrial Area|Industrial Estate|MIDC Zone|Notified Area)\s*[:\-]\s*([^\n\r,]+)/i,
      /\b(MIDC\s+[A-Za-z0-9\-]+(?:\s+Industrial\s+Area)?)\b/i,
      /\b(MIDC\s+Industrial\s+Area)\b/i,
    ],
    transform: (v) => v.trim().replace(/^[:\-,\s]+|[:\-,\s]+$/g, ''),
  },
  {
    key: 'registered_address',
    label: 'Address / Registered Office',
    category: 'Site',
    patterns: [
      /(?:Registered Office|Registered Address|Factory Address|Site Address|Address)\s*[:\-]?\s*([^\n\r]+)/i,
    ],
    transform: (v) => v.trim(),
  },

  // ── Utilities / Technical ────────────────────────────────────────────────
  {
    key: 'worker_count',
    label: 'Total Workers',
    category: 'Utilities',
    patterns: [
      /(?:Total Workers|Workers|Employee Count|Worker Count|Total Employees)\s*[:\-]?\s*([0-9,]+)/i,
    ],
    transform: (v) => {
      const parsed = parseInt(v.replace(/,/g, ''), 10);
      return isNaN(parsed) ? v.trim() : parsed;
    },
  },
  {
    key: 'power_demand_kva',
    label: 'Connected Power Demand',
    category: 'Utilities',
    patterns: [
      /(?:Connected Power Demand|Connected Power|Requested \/ Sanctioned Demand|Sanctioned Demand|Contract Demand|Power Demand|Power Requirement)\s*[:\-]?\s*([0-9,.]+)\s*(?:kVA|kva|KW|kW)?/i,
    ],
    transform: (v) => {
      const parsed = parseFloat(v.replace(/,/g, ''));
      return isNaN(parsed) ? v.trim() : parsed;
    },
  },
  {
    key: 'water_demand_kld',
    label: 'Water Demand',
    category: 'Utilities',
    patterns: [
      /(?:Water Demand|Water Requirement|Daily Consumption)\s*[:\-]?\s*([0-9,.]+)\s*(?:KLD|kld|m3\/day)?/i,
    ],
    transform: (v) => {
      const parsed = parseFloat(v.replace(/,/g, ''));
      return isNaN(parsed) ? v.trim() : parsed;
    },
  },
  {
    key: 'pollution_category',
    label: 'Pollution Category',
    category: 'Utilities',
    patterns: [
      /(?:Pollution Category|Category of Industry)\s*[:\-]?\s*(Red|Orange|Green|White)/i,
    ],
    transform: (v) => v.trim(),
  },

  // ── Dates ────────────────────────────────────────────────────────────────
  {
    key: 'document_date',
    label: 'Document Date',
    category: 'Dates',
    patterns: [
      /(?:Agreement Date|Sanction Date|Declaration Date|Drawing Date|Application Date|Date of Issue|Date of Incorporation|Document Date|Date)\s*[:\-]?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    ],
    transform: (v) => v.trim(),
  },
  {
    key: 'expiry_date',
    label: 'Expiry / Validity Date',
    category: 'Dates',
    patterns: [
      /(?:to|Valid Upto|Expiry Date|Valid To)\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    ],
    transform: (v) => v.trim(),
  },

  // ── References ───────────────────────────────────────────────────────────
  {
    key: 'reference_number',
    label: 'Reference Number',
    category: 'References',
    patterns: [
      /(?:Drawing Reference|Sanction Reference|Application Reference|Reference)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i,
      /\b(DEMO-[A-Z0-9\-]+)\b/i,
    ],
    transform: (v) => v.trim(),
  },
];

/**
 * Extracts raw text from a PDF Buffer using pdf-parse.
 * Handles unreadable or scanned documents safely without crashing.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  isReadable: boolean;
  pageCount: number;
}> {
  if (!buffer || buffer.length === 0) {
    return { text: '', isReadable: false, pageCount: 0 };
  }

  // Check if buffer starts with PDF magic number %PDF-
  const isPdfHeader = buffer.slice(0, 5).toString('ascii').startsWith('%PDF');
  if (!isPdfHeader) {
    // If not a PDF header, try UTF-8 string conversion (e.g. for text/csv files)
    const textSample = buffer.toString('utf-8');
    const isReadableText = textSample.replace(/[^\x20-\x7E\n\r\t]/g, '').length > 20;
    return {
      text: isReadableText ? textSample : '',
      isReadable: isReadableText,
      pageCount: 1,
    };
  }

  try {
    const parser = new PDFParse({ data: buffer });
    await parser.load();
    const result = await parser.getText();
    await parser.destroy().catch(() => {});

    const text = (result?.text || '').trim();
    // A document is readable if it contains at least 20 alphanumeric characters
    const alphaCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
    const isReadable = alphaCount >= 20;

    return {
      text,
      isReadable,
      pageCount: result?.total || (result?.pages ? result.pages.length : 1),
    };
  } catch (err) {
    // Parser error (e.g. encrypted, corrupted, or scanned image with no text stream)
    return { text: '', isReadable: false, pageCount: 1 };
  }
}

/**
 * Extracts structured regulatory fields from a PDF buffer or text string.
 * Driven strictly by pattern configuration without hardcoded company names or values.
 */
export async function extractFieldsFromPdf(
  buffer: Buffer,
  meta: {
    documentId: string;
    fileName?: string;
    documentType?: string;
  }
): Promise<DocumentExtractionResult> {
  const { text, isReadable, pageCount } = await extractTextFromPdf(buffer);

  const timestamp = new Date().toISOString();

  if (!isReadable) {
    return {
      document_id: meta.documentId,
      document_type: meta.documentType,
      file_name: meta.fileName,
      is_readable: false,
      page_count: pageCount,
      status: 'MANUAL_VERIFICATION_REQUIRED',
      extracted_at: timestamp,
      field_count: 0,
      fields: {},
      raw_text_preview: text.length > 0 ? text.slice(0, 200) : undefined,
    };
  }

  const extractedMap: Record<string, ExtractedFieldRecord> = {};
  let count = 0;

  for (const def of FIELD_DEFINITIONS) {
    for (const pat of def.patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const raw = match[1].trim();
        const value = def.transform ? def.transform(raw) : raw;
        if (value !== '' && value !== undefined && value !== null) {
          extractedMap[def.key] = {
            key: def.key,
            label: def.label,
            category: def.category,
            value,
            raw_value: raw,
            status: 'EXTRACTED',
            extracted_at: timestamp,
            confidence: 0.95,
          };
          count++;
          break;
        }
      }
    }
  }

  return {
    document_id: meta.documentId,
    document_type: meta.documentType,
    file_name: meta.fileName,
    is_readable: true,
    page_count: pageCount,
    status: count > 0 ? 'EXTRACTED' : 'MANUAL_VERIFICATION_REQUIRED',
    extracted_at: timestamp,
    field_count: count,
    fields: extractedMap,
    raw_text_preview: text.length > 500 ? text.slice(0, 500) + '...' : text,
  };
}
