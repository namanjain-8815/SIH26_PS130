/**
 * Prescribed Application Form & Template Service (P1.8)
 * 
 * Provides approval-specific statutory forms and demonstration templates.
 * Supports download of prescribed format and guided re-upload via Document Pre-Validation.
 */

export interface PrescribedForm {
  id: string;
  form_name: string;
  document_type: string;
  approval_patterns: string[];
  source_label: string;
  source_url?: string;
  category: 'Statutory Prescribed Format' | 'Demonstration / Configurable Form';
  version: string;
  effective_date: string;
  description: string;
  file_name: string;
  mime_type: string;
  template_content: string;
}

export const PRESCRIBED_FORMS: PrescribedForm[] = [
  {
    id: 'form-mpcb-cte-red',
    form_name: 'Form-I: Application for Consent to Establish under Water & Air Acts',
    document_type: 'Environmental Impact Assessment (EIA)',
    approval_patterns: ['Consent to Establish', 'CTE', 'MPCB', 'Pollution'],
    source_label: 'Maharashtra Pollution Control Board (MPCB) · Schedule-I Regulations',
    source_url: 'https://mpcb.gov.in',
    category: 'Statutory Prescribed Format',
    version: 'Rev 2024.1',
    effective_date: '2024-01-01',
    description:
      'Statutory Form-I declaration covering proposed manufacturing process, daily water consumption balance, effluent treatment plant (ETP) capacity, and stack emissions.',
    file_name: 'MPCB_Form_I_Consent_to_Establish_Template.pdf',
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% Statutory Form-I Template
GOVERNMENT OF MAHARASHTRA · MAHARASHTRA POLLUTION CONTROL BOARD
FORM-I: APPLICATION FOR CONSENT TO ESTABLISH (Under Section 25 of Water Act & Section 21 of Air Act)

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
    form_name: 'Form 2: Application for Registration and Grant/Renewal of Licence for a Factory',
    document_type: 'Factory Layout Plan',
    approval_patterns: ['Factory', 'DISH', 'Layout', 'Licence'],
    source_label: 'Directorate of Industrial Safety & Health (DISH) · Maharashtra Factories Rules, 1963',
    source_url: 'https://dish.maharashtra.gov.in',
    category: 'Statutory Prescribed Format',
    version: 'Rule 4 & 7 Format',
    effective_date: '2023-04-01',
    description:
      'Official statutory format for plant layout, machinery layout spacing, internal gangways, ventilation, and emergency egress specifications.',
    file_name: 'DISH_Form_2_Factory_Licence_Application_Template.pdf',
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% Statutory Form 2 Template
DIRECTORATE OF INDUSTRIAL SAFETY & HEALTH · GOVERNMENT OF MAHARASHTRA
FORM 2: APPLICATION FOR REGISTRATION AND GRANT OF LICENCE FOR A FACTORY (Rules 4 and 7)

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
    id: 'form-midc-fire-safety',
    form_name: 'Annexure-A: Fire & Life Safety Assessment Requisition Form',
    document_type: 'Fire Safety Layout Drawing',
    approval_patterns: ['Fire', 'NOC', 'Safety'],
    source_label: 'Maharashtra Fire Prevention and Life Safety Measures Act, 2006',
    category: 'Demonstration / Configurable Form',
    version: 'MFP-2023-A',
    effective_date: '2023-01-15',
    description:
      'Standardized fire risk assessment checklist, hydrant/sprinkler layout requirements, and static water tank capacity calculation sheet.',
    file_name: 'MIDC_Fire_Safety_NOC_Annexure_A_Template.pdf',
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% Fire Safety Annexure A
FIRE ADVISORY SERVICES · MAHARASHTRA INDUSTRIAL DEVELOPMENT CORPORATION
ANNEXURE-A: PROVISIONAL FIRE SAFETY CLEARANCE QUESTIONNAIRE

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
    source_label: 'MSEDCL Industrial Supply Code Regulations · Regulation 4.2',
    category: 'Statutory Prescribed Format',
    version: 'MSEDCL-HT-2024',
    effective_date: '2024-03-01',
    description:
      'Official requisition for industrial contract demand (kVA/kW), step-down transformer specifications, and single line diagram (SLD) declaration.',
    file_name: 'MSEDCL_Form_A1_Industrial_Power_Supply_Template.pdf',
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% MSEDCL A-1 Power Requisition Form
MAHARASHTRA STATE ELECTRICITY DISTRIBUTION COMPANY LIMITED (MSEDCL)
FORM A-1: REQUISITION FOR HIGH TENSION INDUSTRIAL ELECTRIC POWER SUPPLY

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
  {
    id: 'form-midc-water-allotment',
    form_name: 'Form W-1: Industrial Water Supply Allotment Application',
    document_type: 'Lease Agreement / Land Title',
    approval_patterns: ['Water Supply', 'Water Connection', 'MIDC Water'],
    source_label: 'MIDC Water Supply Regulations & Byelaws',
    category: 'Demonstration / Configurable Form',
    version: 'MIDC-W1-v2',
    effective_date: '2023-08-01',
    description:
      'Daily water allocation requisition sheet (domestic vs industrial process), effluent recycling percentage, and internal distribution blueprint.',
    file_name: 'MIDC_Form_W1_Water_Allotment_Template.pdf',
    mime_type: 'application/pdf',
    template_content: `%PDF-1.4
% MIDC Water Allotment Form
MAHARASHTRA INDUSTRIAL DEVELOPMENT CORPORATION (MIDC)
FORM W-1: INDUSTRIAL WATER ALLOTMENT & PIPELINE CONNECTION

1. Plot & Allotment Particulars:
   - Industrial Plot No: __________________  Industrial Area: ____________
   - Lease Deed Execution Date: _______________________________________

2. Requirement Details:
   - Daily Quantity Required (Kilolitres/Day): ________________________
   - Meter Connection Size (mm diameter): ____________________________

Date: ______________                                Signature of Applicant
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
