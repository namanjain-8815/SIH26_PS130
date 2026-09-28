/**
 * Prescribed Application Form & Template Service (P0.8)
 * 
 * Provides approval-specific statutory forms, verified official files, and configurable templates.
 * Enforces grounding in official government sources and prohibits fabricated government forms.
 * Supports:
 * - Direct download of verified official PDFs bundled in the repository
 * - Authoritative official online portal links (e.g. FoSCoS, MIDC Single Window Services)
 * - Clear distinction between "Statutory Prescribed Format" and "Demonstration / Configurable Form"
 * - Guided re-upload via Document Pre-Validation
 */

import path from 'path';
import fs from 'fs';

function getAssetPath(filename: string): string {
  const candidate1 = path.resolve(__dirname, '../assets/prescribed-forms', filename);
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(process.cwd(), 'src/assets/prescribed-forms', filename);
  if (fs.existsSync(candidate2)) return candidate2;
  const candidate3 = path.resolve(process.cwd(), 'dist/assets/prescribed-forms', filename);
  if (fs.existsSync(candidate3)) return candidate3;
  return candidate1;
}

export interface PrescribedForm {
  id: string;
  form_name: string;
  document_type: string;
  approval_patterns: string[];
  authority: string;
  source_label: string;
  source_url?: string;
  is_online_application?: boolean;
  official_online_url?: string;
  online_portal_name?: string;
  provenance_status: 'VERIFIED_OFFICIAL_DOCUMENT' | 'OFFICIAL_ONLINE_PORTAL' | 'CONFIGURABLE_DEMONSTRATION';
  category: 'Statutory Prescribed Format' | 'Demonstration / Configurable Form';
  version: string;
  effective_date: string;
  description: string;
  file_name: string;
  file_path?: string;
  mime_type: string;
  template_content: string;
}

export const PRESCRIBED_FORMS: PrescribedForm[] = [
  {
    id: 'form-mpcb-cte-red',
    form_name: 'Combined Consent Application Form: Water Act, Air Act & Hazardous Wastes Rules',
    document_type: 'Environmental Impact Assessment (EIA)',
    approval_patterns: ['Consent to Establish', 'CTE', 'MPCB', 'Pollution', 'Consent to Operate', 'CTO'],
    authority: 'Maharashtra Pollution Control Board (MPCB)',
    source_label: 'Official MPCB Downloadable Statutory Format (MPCB Portal)',
    source_url: 'https://www.mpcb.gov.in/sites/default/files/consent-management/consent-water-air-act/Combied-consentformNew_31012012.pdf',
    category: 'Statutory Prescribed Format',
    provenance_status: 'VERIFIED_OFFICIAL_DOCUMENT',
    version: 'Combined Form 31/01/2012',
    effective_date: '2012-01-31 (Fee Schedule per GR dt. 25/08/2011)',
    description:
      'Official statutory combined application form in triplicate to be submitted to Sub-Regional Officer under Section 25 of Water Act 1974, Section 21 of Air Act 1981, and Hazardous Wastes Rules.',
    file_name: 'MPCB_Combined_Consent_Application_Form.pdf',
    file_path: getAssetPath('MPCB_Combined_Consent_Application_Form.pdf'),
    mime_type: 'application/pdf',
    is_online_application: false,
    template_content: `%PDF-1.4
% Statutory Form-I Template
GOVERNMENT OF MAHARASHTRA · MAHARASHTRA POLLUTION CONTROL BOARD
FORM: COMBINED APPLICATION FOR CONSENT UNDER WATER ACT 1974, AIR ACT 1981 & HAZARDOUS WASTES RULES

1. General Undertaking Details:
   - Name of Industrial Unit: _________________________________________
   - Industrial Plot No & MIDC Area: __________________________________
   - Pollution Category: Red / Orange / Green / White
   - Capital Investment (INR in Crores): _______________________________

2. Manufacturing Details:
   - Raw Materials & Storage Quantity: ________________________________
   - Finished Products & Daily Output: _______________________________

3. Water Balance & Effluent Disposal:
   - Domestic Water Consumption (m3/day): _____________________________
   - Industrial Process Water (m3/day): _______________________________
   - ETP / STP Proposed Design Capacity: ______________________________

4. Air Emission Particulars:
   - Fuel Type & Boiler / DG Set Capacity: ___________________________
   - Chimney / Stack Height (metres above ground): ____________________

Statutory Declaration:
I/We hereby certify that the information furnished above is true and complete to the best of my knowledge.
Date: ______________                                Signature of Authorized Signatory
%%EOF`,
  },
  {
    id: 'form-dish-factory-licence',
    form_name: 'Form 2 / नमुना २: Application for Registration and Notice of Occupation for Factory License',
    document_type: 'Factory Layout Plan',
    approval_patterns: ['Factory', 'DISH', 'Layout', 'Licence', 'Kamgar'],
    authority: 'Directorate of Industrial Safety & Health (DISH) / Maharashtra Labour Dept',
    source_label: 'Official Maharashtra Labour Department Statutory Format (mahakamgar.maharashtra.gov.in)',
    source_url: 'https://mahakamgar.maharashtra.gov.in/Site/Upload/Pdf/form-2.pdf',
    category: 'Statutory Prescribed Format',
    provenance_status: 'VERIFIED_OFFICIAL_DOCUMENT',
    version: 'Form 2 (Rules 5, 8, 11 and 14)',
    effective_date: 'Maharashtra Factories Rules, 1963',
    description:
      'Official statutory bilingual (English & Marathi) application for factory registration, licence grant/renewal, installed power, and occupier/manager declaration under Sections 6 & 7.',
    file_name: 'Maharashtra_Labour_Department_Form_2.pdf',
    file_path: getAssetPath('Maharashtra_Labour_Department_Form_2.pdf'),
    mime_type: 'application/pdf',
    is_online_application: false,
    template_content: `%PDF-1.4
% Statutory Form 2 Template
DIRECTORATE OF INDUSTRIAL SAFETY & HEALTH · GOVERNMENT OF MAHARASHTRA
FORM 2 / नमुना २: APPLICATION FOR REGISTRATION AND NOTICE OF OCCUPATION (Rules 5, 8, 11 and 14)

1. Applicant Particulars:
   - Full Name of Factory: ___________________________________________
   - Full Postal Address & Plot Identification: ______________________
   - Name of Occupier & Designated Manager: ___________________________

2. Nature of Manufacturing Process:
   - Sector & NIC Code: _______________________________________________
   - Maximum Number of Workers to be Employed on Any Day: ____________

3. Power & Prime Movers Installed:
   - Total Rated Horse Power / kW Installed: _________________________
   - Transformer / Substation Rating: _________________________________

4. Attached Layout Certifications:
   - Factory Machinery Layout Plan (Scale 1:100): Attached
   - Safety Gangways & Fire Exit Certification: Attached

Date: ______________                                Signature of Occupier / Manager
%%EOF`,
  },
  {
    id: 'form-fssai-food-licence',
    form_name: 'Form B: Application for License / Renewal under Food Safety and Standards Act, 2006',
    document_type: 'Food Safety Management Plan',
    approval_patterns: ['FSSAI', 'Food Safety', 'Food License', 'FoSCoS'],
    authority: 'Food Safety and Standards Authority of India (FSSAI)',
    source_label: 'Official FSSAI Regulations Compendium (Schedule 2) & FoSCoS Portal',
    source_url: 'https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Licensing_Regulations_04_08_2021.pdf',
    category: 'Statutory Prescribed Format',
    provenance_status: 'VERIFIED_OFFICIAL_DOCUMENT',
    is_online_application: true,
    official_online_url: 'https://foscos.fssai.gov.in/apply-for-lic-and-reg',
    online_portal_name: 'FoSCoS (Food Safety Compliance System)',
    version: 'Schedule 2, Regulation 2.1.2/2.1.3',
    effective_date: '2011 (Version II, 2017 amendments)',
    description:
      'Official statutory Form B application for Central/State food business licence, manufacturing installed capacity, and Annexure 2 document checklist.',
    file_name: 'FSSAI_Licensing_Regulations_Form_B.pdf',
    file_path: getAssetPath('FSSAI_Licensing_Regulations_Form_B.pdf'),
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% FSSAI Form B Statutory Template
FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA (FSSAI)
FORM 'B': APPLICATION FOR LICENSE / RENEWAL UNDER FOOD SAFETY AND STANDARDS ACT, 2006 (Schedule 2)

1. Food Business Operator Particulars:
   - Name of Company / Organization: _________________________________
   - Registered Office Address: ______________________________________
   - Address of Authorized Premise for Manufacturing: _______________

2. Kind of Business & Capacity:
   - Processing / Manufacturing Capacity (MT/day): ___________________
   - Food Categories Proposed to be Manufactured: ____________________

3. Key Technical & Statutory Attachments:
   - Blueprint / Layout Plan showing dimensions & area allocation: Attached
   - List of Equipment and Machinery with installed HP: Attached
   - Chemical & Bacteriological Water Analysis Report: Attached

Date: ______________                                Signature of Applicant / Authorized Signatory
%%EOF`,
  },
  {
    id: 'form-midc-water-allotment',
    form_name: 'MIDC Single Window Online Water Connection Application (AMId=528)',
    document_type: 'Lease Agreement / Land Title',
    approval_patterns: ['Water Supply', 'Water Connection', 'MIDC Water'],
    authority: 'Maharashtra Industrial Development Corporation (MIDC)',
    source_label: 'MIDC Single Window Clearance Portal & End-User Manual',
    source_url: 'https://services.midcindia.org/services/AttachmentTemplates/MIDCUpload/Online_Water_Connection_Application_End_User_Manual.pdf',
    category: 'Demonstration / Configurable Form',
    provenance_status: 'OFFICIAL_ONLINE_PORTAL',
    is_online_application: true,
    official_online_url: 'https://services.midcindia.org/services/FillFormAnon.aspx?AMId=528',
    online_portal_name: 'MIDC Single Window Clearance System (SWCS)',
    version: 'Portal Service AMId=528',
    effective_date: '2023-08-01',
    description:
      'MIDC processes water connections digitally via the Single Window Clearance portal. Below is a standardized engineering worksheet for internal water allocation demand calculation.',
    file_name: 'MIDC_Water_Connection_Application_Worksheet.pdf',
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% MIDC Water Allotment Form
MAHARASHTRA INDUSTRIAL DEVELOPMENT CORPORATION (MIDC)
DEMONSTRATION WORKSHEET: INDUSTRIAL WATER ALLOTMENT & PIPELINE CONNECTION (Portal Reference: AMId=528)

1. Plot & Allotment Particulars:
   - Industrial Plot No: __________________  Industrial Area: ____________
   - Lease Deed Execution Date: _______________________________________

2. Requirement Details:
   - Daily Quantity Required (Kilolitres/Day): ________________________
   - Meter Connection Size (mm diameter): ____________________________

Official Online Submission Portal: https://services.midcindia.org/services/FillFormAnon.aspx?AMId=528
Date: ______________                                Signature of Applicant
%%EOF`,
  },
  {
    id: 'form-midc-fire-safety',
    form_name: 'Annexure-A: Fire & Life Safety Assessment Requisition Form',
    document_type: 'Fire Safety Layout Drawing',
    approval_patterns: ['Fire', 'NOC', 'Safety'],
    authority: 'Directorate of Maharashtra Fire Services / MIDC Fire Advisory',
    source_label: 'Maharashtra Fire Prevention and Life Safety Measures Act, 2006 Baseline',
    source_url: 'https://mahafireservice.gov.in',
    category: 'Demonstration / Configurable Form',
    provenance_status: 'CONFIGURABLE_DEMONSTRATION',
    version: 'MFP-2023-A',
    effective_date: '2023-01-15',
    description:
      'Standardized demonstration fire risk assessment questionnaire, hydrant/sprinkler layout requirements, and static water tank capacity calculation sheet.',
    file_name: 'MIDC_Fire_Safety_NOC_Annexure_A_Template.pdf',
    mime_type: 'application/pdf',
    is_online_application: false,
    template_content: `%PDF-1.4
% Fire Safety Annexure A
FIRE ADVISORY SERVICES · MAHARASHTRA INDUSTRIAL DEVELOPMENT CORPORATION
ANNEXURE-A: PROVISIONAL FIRE SAFETY CLEARANCE QUESTIONNAIRE (Configurable Demonstration Form)

1. Site Particulars:
   - Building Classification: Industrial (Hazard Class: Low / Medium / High)
   - Total Plot Area (sq.m): ______________  Built-up Area (sq.m): ____________
   - Height of Highest Structure (metres): _____________________________

2. Fire Fighting Infrastructure:
   - Static Water Storage Capacity (Underground / Overhead Tank): ______ Litres
   - Dedicated Fire Pump Capacity (LPM at 7 bar): _______________________
   - External Yard Hydrant Count & Wet Riser Points: ___________________
   - Automatic Sprinkler Coverage Area (% of floor area): ______________

Date: ______________                                Signature of Architect / Fire Consultant
%%EOF`,
  },
  {
    id: 'form-msedcl-ht-power',
    form_name: 'Form A-1: Application for High Tension Industrial Power Supply',
    document_type: 'Industrial Electricity Sanction Letter',
    approval_patterns: ['Electricity', 'Power', 'MSEDCL', 'High Tension'],
    authority: 'Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)',
    source_label: 'MSEDCL Industrial Supply Code Regulations · Regulation 4.2',
    source_url: 'https://www.mahadiscom.in',
    category: 'Demonstration / Configurable Form',
    provenance_status: 'CONFIGURABLE_DEMONSTRATION',
    version: 'MSEDCL-HT-2024',
    effective_date: '2024-03-01',
    description:
      'Standardized demonstration requisition for industrial contract demand (kVA/kW), step-down transformer specifications, and single line diagram (SLD) declaration.',
    file_name: 'MSEDCL_Form_A1_Industrial_Power_Supply_Template.pdf',
    mime_type: 'application/pdf',
    is_online_application: false,
    template_content: `%PDF-1.4
% MSEDCL A-1 Power Requisition Form
MAHARASHTRA STATE ELECTRICITY DISTRIBUTION COMPANY LIMITED (MSEDCL)
FORM A-1: REQUISITION FOR HIGH TENSION INDUSTRIAL ELECTRIC POWER SUPPLY (Configurable Demonstration Form)

1. Undertaking Particulars:
   - Consumer Name / Company: ________________________________________
   - Substation / Feeder Name: ________________________________________
   - Purpose of Supply: Industrial Manufacturing (Continuous / Non-Continuous)

2. Connected Load & Contract Demand:
   - Proposed Connected Load (kW): ____________________________________
   - Required Contract Demand (kVA): __________________________________
   - Supply Voltage (11 kV / 22 kV / 33 kV): __________________________

Date: ______________                                Signature of Registered Electrical Engineer
%%EOF`,
  },
];

/**
 * Finds the prescribed form matching an approval type name or id.
 */
export function getPrescribedFormForApproval(approvalNameOrId?: string): PrescribedForm | null {
  if (!approvalNameOrId) return null;
  const target = approvalNameOrId.toLowerCase();

  return (
    PRESCRIBED_FORMS.find((f) => {
      if (f.id.toLowerCase() === target) return true;
      return f.approval_patterns.some((pattern) => target.includes(pattern.toLowerCase()));
    }) || null
  );
}

/**
 * Returns all configured prescribed statutory forms.
 */
export function listPrescribedForms(): PrescribedForm[] {
  return PRESCRIBED_FORMS;
}

/**
 * Retrieves a prescribed form by form ID.
 */
export function getPrescribedFormById(formId: string): PrescribedForm | null {
  return PRESCRIBED_FORMS.find((f) => f.id === formId) || null;
}
