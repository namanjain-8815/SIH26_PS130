/**
 * Seed file — IMPLEMENTATION_PLAN.md §9, DEVELOPER_GUIDE.md §§5,7,9
 *
 * Run with: npm run seed
 * All inserts use upsert so re-runs are idempotent.
 *
 * Demo project: ABC Foods Pvt Ltd — New Food Processing Unit
 *   Sector: Food Processing, District: Pune, Industrial area: MIDC
 *   Investment: ₹25 Cr, Employees: 80, Stage: pre_establishment
 *
 * Fixed UUIDs are used throughout so upserts work correctly.
 */

import { db as prisma } from './lib/supabaseDb';
import {
  Role,
  ProjectApprovalStatus,
  ApplicationStatus,
  Priority,
  QueryStatus,
  InspectionStatus,
  SLAStatus,
  IncentiveMatchStatus,
  ComplianceStatus,
  DocumentVerificationStatus,
  ApplicationDocValidationStatus,
  FindingSeverity,
  DependencyType,
} from './types/database';
import bcrypt from 'bcrypt';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@123';

// ---------------------------------------------------------------------------
// IDs — fixed so upserts are idempotent
// ---------------------------------------------------------------------------

const IDs = {
  // Organizations / departments
  org: 'org-abc-foods',
  dept_midc: 'dept-midc',
  dept_pcb: 'dept-pcb',
  dept_fire: 'dept-fire',
  dept_labour: 'dept-labour',
  dept_electricity: 'dept-electricity',
  dept_fssai: 'dept-fssai',

  // Project
  project: 'proj-abc-foods-001',

  // ApprovalType IDs
  at_pollution_consent: 'at-pollution-consent',
  at_fire_noc: 'at-fire-noc',
  at_factory_license: 'at-factory-license',
  at_electricity_connection: 'at-electricity-connection',
  at_labour_registration: 'at-labour-reg',
  at_fssai_license: 'at-fssai-lic',
  at_water_connection: 'at-water-conn',
  at_trade_license: 'at-trade-lic',
  at_building_plan_approval: 'at-building-plan',
  at_env_clearance: 'at-env-clearance',

  // ApplicabilityRule IDs
  rule_pollution: 'rule-pollution-mfg-mh',
  rule_fire_noc: 'rule-fire-noc-mh',
  rule_factory: 'rule-factory-lic-mh',
  rule_electricity: 'rule-electricity-mh',
  rule_labour: 'rule-labour-mh',
  rule_fssai: 'rule-fssai-food',
  rule_water: 'rule-water-midc',
  rule_trade: 'rule-trade-lic-mh',
  rule_building: 'rule-building-plan-mh',
  rule_env: 'rule-env-clearance-food',

  // ApprovalDependency IDs
  dep_factory_needs_pollution: 'dep-factory-needs-pollution',
  dep_factory_needs_building: 'dep-factory-needs-building',
  dep_fssai_needs_factory: 'dep-fssai-needs-factory',
  dep_electricity_needs_building: 'dep-elec-needs-building',
  dep_pollution_needs_env: 'dep-pollution-needs-env',

  // SLAPolicy IDs
  sla_pollution: 'sla-pollution',
  sla_fire_noc: 'sla-fire-noc',
  sla_factory: 'sla-factory',
  sla_electricity: 'sla-electricity',
  sla_labour: 'sla-labour',
  sla_fssai: 'sla-fssai',
  sla_water: 'sla-water',
  sla_trade: 'sla-trade',
  sla_building: 'sla-building',
  sla_env: 'sla-env',

  // ProjectApproval IDs
  pa_pollution: 'pa-pollution',
  pa_fire_noc: 'pa-fire-noc',
  pa_factory: 'pa-factory',
  pa_electricity: 'pa-electricity',
  pa_labour: 'pa-labour',
  pa_fssai: 'pa-fssai',
  pa_water: 'pa-water',
  pa_trade: 'pa-trade',
  pa_building: 'pa-building',
  pa_env: 'pa-env',

  // Application IDs
  app_env: 'app-env-clearance',
  app_building: 'app-building-plan',
  app_pollution: 'app-pollution',
  app_fire_noc: 'app-fire-noc',
  app_factory: 'app-factory',
  app_electricity: 'app-electricity',
  app_fssai: 'app-fssai',

  // Document IDs
  doc_pan: 'doc-pan-card',
  doc_land_title: 'doc-land-title',
  doc_mou: 'doc-mou',
  doc_env_report: 'doc-env-report',
  doc_building_drawing: 'doc-building-drawing',
  doc_pollution_certificate: 'doc-pollution-cert',
  doc_fire_drawing: 'doc-fire-drawing',

  // IncentiveScheme IDs
  inc_package_2019: 'inc-mah-package-2019',
  inc_msme_subsidy: 'inc-msme-subsidy',
  inc_food_park: 'inc-food-park-scheme',
  inc_employment: 'inc-employment-gen',

  // IncentiveMatch IDs
  im_package: 'im-package-2019',
  im_msme: 'im-msme-subsidy',
  im_food_park: 'im-food-park',
  im_employment: 'im-employment',

  // ComplianceRequirement IDs
  comp_pollution_renewal: 'comp-pollution-renewal',
  comp_factory_renewal: 'comp-factory-renewal',
  comp_fssai_renewal: 'comp-fssai-renewal',
  comp_fire_renewal: 'comp-fire-renewal',

  // Query IDs
  query_env_docs: 'query-env-docs',
  query_pollution_tech: 'query-pollution-tech',

  // Inspection IDs
  insp_factory: 'insp-factory-site',

  // SLAInstance IDs
  sla_inst_env: 'slai-env',
  sla_inst_building: 'slai-building',
  sla_inst_pollution: 'slai-pollution',
  sla_inst_factory: 'slai-factory',
  sla_inst_fire: 'slai-fire',
  sla_inst_fssai: 'slai-fssai',
  sla_inst_electricity: 'slai-electricity',
};

// ---------------------------------------------------------------------------
// Reference date helpers
// ---------------------------------------------------------------------------
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

// ---------------------------------------------------------------------------
// 1. Organization & Departments
// ---------------------------------------------------------------------------
async function seedOrgsAndDepts() {
  const org = await prisma.organization.upsert({
    where: { id: IDs.org },
    update: {},
    create: {
      id: IDs.org,
      legal_name: 'ABC Foods Pvt Ltd',
      entity_type: 'Private Limited Company',
      sector: 'Food Processing',
    },
  });

  const deptMidc = await prisma.department.upsert({
    where: { id: IDs.dept_midc },
    update: {},
    create: {
      id: IDs.dept_midc,
      name: 'Maharashtra Industrial Development Corporation (MIDC)',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  await prisma.department.upsert({
    where: { id: IDs.dept_pcb },
    update: {},
    create: {
      id: IDs.dept_pcb,
      name: 'Maharashtra Pollution Control Board (MPCB)',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  await prisma.department.upsert({
    where: { id: IDs.dept_fire },
    update: {},
    create: {
      id: IDs.dept_fire,
      name: 'Pune Municipal Corporation — Fire Department',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  await prisma.department.upsert({
    where: { id: IDs.dept_labour },
    update: {},
    create: {
      id: IDs.dept_labour,
      name: 'Maharashtra Labour Department',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  await prisma.department.upsert({
    where: { id: IDs.dept_electricity },
    update: {},
    create: {
      id: IDs.dept_electricity,
      name: 'Maharashtra State Electricity Distribution Co. Ltd (MSEDCL)',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  await prisma.department.upsert({
    where: { id: IDs.dept_fssai },
    update: {},
    create: {
      id: IDs.dept_fssai,
      name: 'Food Safety and Standards Authority of India (FSSAI)',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  return { org, deptMidc };
}

// ---------------------------------------------------------------------------
// 2. Demo Users
// ---------------------------------------------------------------------------
async function seedUsers(orgId: string) {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const accounts: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    org_id?: string;
    department_id?: string;
  }> = [
    { id: 'user-entrepreneur', name: 'Rajesh Mehta', email: 'entrepreneur@demo.local', role: 'ENTREPRENEUR', org_id: orgId },
    { id: 'user-manager', name: 'Priya Sharma', email: 'manager@demo.local', role: 'MANAGER', org_id: orgId },
    { id: 'user-officer', name: 'Vijay Patil', email: 'officer@demo.local', role: 'OFFICER', department_id: IDs.dept_midc },
    { id: 'user-nodal', name: 'Sunita Rao', email: 'nodal@demo.local', role: 'NODAL', department_id: IDs.dept_midc },
    { id: 'user-inspector', name: 'Arun Kumar', email: 'inspector@demo.local', role: 'INSPECTOR', department_id: IDs.dept_midc },
    { id: 'user-admin', name: 'Admin User', email: 'admin@demo.local', role: 'ADMIN' },
    // PCB officer
    { id: 'user-pcb-officer', name: 'Deepa Nair', email: 'pcb.officer@demo.local', role: 'OFFICER', department_id: IDs.dept_pcb },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: { ...account, password_hash },
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Project + Attributes
// ---------------------------------------------------------------------------
async function seedProject(orgId: string) {
  const project = await prisma.project.upsert({
    where: { id: IDs.project },
    update: {},
    create: {
      id: IDs.project,
      org_id: orgId,
      name: 'ABC Foods Pvt Ltd — New Food Processing Unit',
      type: 'Manufacturing',
      sector: 'Food Processing',
      investment_amount: 25_00_00_000, // ₹25 Crore
      employee_count: 80,
      stage: 'pre_establishment',
      district: 'Pune',
      industrial_area: 'MIDC',
      address: 'Plot No. 42, MIDC Bhosari, Pune 411026, Maharashtra',
      target_start_date: daysFromNow(180),
    },
  });

  // ProjectAttribute rows for rule engine
  const attributes: Record<string, string> = {
    pollution_category: 'red',          // Red category — requires consent from MPCB
    water_usage_kld: '50',              // kilolitres per day
    power_requirement_kva: '500',
    product_type: 'processed_food',
    waste_type: 'effluent',
    land_area_sqm: '5000',
    building_type: 'industrial',
    state: 'maharashtra',
    industrial_area: 'MIDC',
    sector: 'food_processing',
  };

  for (const [key, value] of Object.entries(attributes)) {
    await prisma.projectAttribute.upsert({
      where: { project_id_key: { project_id: project.id, key } },
      update: { value },
      create: { project_id: project.id, key, value },
    });
  }

  return project;
}

// ---------------------------------------------------------------------------
// 4. ApprovalTypes
// ---------------------------------------------------------------------------
async function seedApprovalTypes() {
  const SOURCE = 'Demonstration / configurable regulatory data — not a legally authoritative source.';

  const approvalTypes = [
    {
      id: IDs.at_env_clearance,
      name: 'Environmental Clearance',
      authority: 'State Environment Impact Assessment Authority (SEIAA)',
      category: 'Environment',
      description: 'Mandatory clearance for projects with significant environmental impact.',
      purpose: 'Assess and mitigate environmental impact of the proposed industrial activity.',
      default_sla_days: 90,
      renewal_period_days: 1825, // 5 years
      requires_inspection: true,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_building_plan_approval,
      name: 'Building Plan Approval',
      authority: 'MIDC / Local Planning Authority',
      category: 'Construction',
      description: 'Approval of architectural and structural drawings before construction commences.',
      purpose: 'Ensure the proposed structure meets building code and industrial zone norms.',
      default_sla_days: 45,
      renewal_period_days: null,
      requires_inspection: false,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_pollution_consent,
      name: 'Pollution Consent to Establish (CTE)',
      authority: 'Maharashtra Pollution Control Board (MPCB)',
      category: 'Environment',
      description: 'Consent to Establish required before setting up any industry with pollution potential.',
      purpose: 'Authorise the establishment of an industry based on its pollution load.',
      default_sla_days: 60,
      renewal_period_days: 365, // annual
      requires_inspection: true,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_fire_noc,
      name: 'Fire No-Objection Certificate (Fire NOC)',
      authority: 'Pune Municipal Corporation — Fire Department',
      category: 'Safety',
      description: 'NOC confirming that the premises comply with fire safety norms.',
      purpose: 'Ensure fire safety measures are adequate for the manufacturing premises.',
      default_sla_days: 30,
      renewal_period_days: 365,
      requires_inspection: true,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_factory_license,
      name: 'Factory License',
      authority: 'Maharashtra Labour Department — Factories Act Division',
      category: 'Labour & Safety',
      description: 'License under the Factories Act 1948 required for all manufacturing units.',
      purpose: 'Regulate safety, health, and welfare conditions for factory workers.',
      default_sla_days: 30,
      renewal_period_days: 365,
      requires_inspection: true,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_electricity_connection,
      name: 'Industrial Electricity Connection',
      authority: 'Maharashtra State Electricity Distribution Co. Ltd (MSEDCL)',
      category: 'Infrastructure',
      description: 'New HT/LT electricity connection for the industrial premises.',
      purpose: 'Provision of reliable power supply for manufacturing operations.',
      default_sla_days: 45,
      renewal_period_days: null,
      requires_inspection: false,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_labour_registration,
      name: 'Contract Labour Registration',
      authority: 'Maharashtra Labour Department',
      category: 'Labour & Safety',
      description: 'Registration under the Contract Labour (Regulation and Abolition) Act 1970.',
      purpose: 'Regulate employment of contract labour and ensure worker welfare.',
      default_sla_days: 15,
      renewal_period_days: 365,
      requires_inspection: false,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_fssai_license,
      name: 'FSSAI Food Business Operator License',
      authority: 'Food Safety and Standards Authority of India (FSSAI)',
      category: 'Food Safety',
      description: 'Mandatory license for all food business operators involved in manufacturing.',
      purpose: 'Ensure food safety, hygiene standards and product compliance.',
      default_sla_days: 60,
      renewal_period_days: 365,
      requires_inspection: true,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_water_connection,
      name: 'Industrial Water Connection',
      authority: 'Maharashtra Industrial Development Corporation (MIDC)',
      category: 'Infrastructure',
      description: 'MIDC water supply connection for industrial process water requirements.',
      purpose: 'Provision of treated water supply for process, cooling, and utility needs.',
      default_sla_days: 30,
      renewal_period_days: null,
      requires_inspection: false,
      source_reference: SOURCE,
    },
    {
      id: IDs.at_trade_license,
      name: 'Trade License / Shops & Establishment Registration',
      authority: 'Pune Municipal Corporation',
      category: 'Business Registration',
      description: 'Trade license required for conducting business within the municipal area.',
      purpose: 'Municipal registration of the business premises and activity.',
      default_sla_days: 21,
      renewal_period_days: 365,
      requires_inspection: false,
      source_reference: SOURCE,
    },
  ];

  for (const at of approvalTypes) {
    await prisma.approvalType.upsert({
      where: { id: at.id },
      update: {},
      create: at,
    });
  }
}

// ---------------------------------------------------------------------------
// 5. ApplicabilityRules (data-driven, AND-group conditions)
// ---------------------------------------------------------------------------
async function seedApplicabilityRules() {
  const rules = [
    {
      id: IDs.rule_env,
      approval_type_id: IDs.at_env_clearance,
      rule_name: 'Environmental Clearance — Food Manufacturing, Maharashtra',
      conditions: [
        { field: 'sector', operator: 'eq', value: 'Food Processing' },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
        { field: 'investment_amount', operator: 'gte', value: 10_00_00_000 },
      ],
      jurisdiction: 'maharashtra',
      sector: 'Food Processing',
    },
    {
      id: IDs.rule_building,
      approval_type_id: IDs.at_building_plan_approval,
      rule_name: 'Building Plan Approval — MIDC Industrial Plot, Maharashtra',
      conditions: [
        { field: 'industrial_area', operator: 'eq', value: 'MIDC' },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
      ],
      jurisdiction: 'maharashtra',
      sector: 'Food Processing',
    },
    {
      id: IDs.rule_pollution,
      approval_type_id: IDs.at_pollution_consent,
      rule_name: 'Pollution Consent to Establish — Red Category, Maharashtra',
      conditions: [
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
        { field: 'sector', operator: 'eq', value: 'Food Processing' },
      ],
      jurisdiction: 'maharashtra',
      sector: 'Food Processing',
    },
    {
      id: IDs.rule_fire_noc,
      approval_type_id: IDs.at_fire_noc,
      rule_name: 'Fire NOC — Manufacturing premises, Maharashtra',
      conditions: [
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
        { field: 'employee_count', operator: 'gte', value: 10 },
      ],
      jurisdiction: 'maharashtra',
      sector: null,
    },
    {
      id: IDs.rule_factory,
      approval_type_id: IDs.at_factory_license,
      rule_name: 'Factory License — Manufacturing, 10+ Workers, Maharashtra',
      conditions: [
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
        { field: 'employee_count', operator: 'gte', value: 10 },
      ],
      jurisdiction: 'maharashtra',
      sector: null,
    },
    {
      id: IDs.rule_electricity,
      approval_type_id: IDs.at_electricity_connection,
      rule_name: 'Industrial Electricity Connection — Maharashtra',
      conditions: [
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
        { field: 'industrial_area', operator: 'eq', value: 'MIDC' },
      ],
      jurisdiction: 'maharashtra',
      sector: null,
    },
    {
      id: IDs.rule_labour,
      approval_type_id: IDs.at_labour_registration,
      rule_name: 'Contract Labour Registration — 20+ Workers, Maharashtra',
      conditions: [
        { field: 'employee_count', operator: 'gte', value: 20 },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
      ],
      jurisdiction: 'maharashtra',
      sector: null,
    },
    {
      id: IDs.rule_fssai,
      approval_type_id: IDs.at_fssai_license,
      rule_name: 'FSSAI License — Food Processing Manufacturing',
      conditions: [
        { field: 'sector', operator: 'eq', value: 'Food Processing' },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
      ],
      jurisdiction: 'maharashtra',
      sector: 'Food Processing',
    },
    {
      id: IDs.rule_water,
      approval_type_id: IDs.at_water_connection,
      rule_name: 'MIDC Water Connection — Industrial Area Project',
      conditions: [
        { field: 'industrial_area', operator: 'eq', value: 'MIDC' },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
      ],
      jurisdiction: 'maharashtra',
      sector: null,
    },
    {
      id: IDs.rule_trade,
      approval_type_id: IDs.at_trade_license,
      rule_name: 'Trade License — Pune Municipal Corporation',
      conditions: [
        { field: 'district', operator: 'eq', value: 'Pune' },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
      ],
      jurisdiction: 'maharashtra',
      sector: null,
    },
  ];

  for (const rule of rules) {
    await prisma.applicabilityRule.upsert({
      where: { id: rule.id },
      update: {},
      create: {
        id: rule.id,
        approval_type_id: rule.approval_type_id,
        rule_name: rule.rule_name,
        conditions: rule.conditions as never,
        jurisdiction: rule.jurisdiction,
        sector: rule.sector,
        active: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 6. DocumentRequirements
// ---------------------------------------------------------------------------
async function seedDocumentRequirements() {
  // Use fixed IDs by composing approval_type_id + doc_type
  const reqs = [
    // Environmental Clearance
    { id: 'dr-env-ein', approval_type_id: IDs.at_env_clearance, document_type: 'Environmental Impact Assessment Report', mandatory: true, condition: null },
    { id: 'dr-env-land', approval_type_id: IDs.at_env_clearance, document_type: 'Land Ownership / Lease Agreement', mandatory: true, condition: null },
    { id: 'dr-env-pan', approval_type_id: IDs.at_env_clearance, document_type: 'Company PAN Card', mandatory: true, condition: null },
    { id: 'dr-env-moa', approval_type_id: IDs.at_env_clearance, document_type: 'Memorandum of Association (MoA)', mandatory: true, condition: null },
    { id: 'dr-env-process', approval_type_id: IDs.at_env_clearance, document_type: 'Project Process Description', mandatory: false, condition: null },

    // Building Plan
    { id: 'dr-bp-drawing', approval_type_id: IDs.at_building_plan_approval, document_type: 'Architectural / Structural Drawings', mandatory: true, condition: null },
    { id: 'dr-bp-land', approval_type_id: IDs.at_building_plan_approval, document_type: 'Land Ownership / Lease Agreement', mandatory: true, condition: null },
    { id: 'dr-bp-layout', approval_type_id: IDs.at_building_plan_approval, document_type: 'Site Layout Plan', mandatory: true, condition: null },

    // Pollution Consent CTE
    { id: 'dr-pc-pan', approval_type_id: IDs.at_pollution_consent, document_type: 'Company PAN Card', mandatory: true, condition: null },
    { id: 'dr-pc-land', approval_type_id: IDs.at_pollution_consent, document_type: 'Land Ownership / Lease Agreement', mandatory: true, condition: null },
    { id: 'dr-pc-env', approval_type_id: IDs.at_pollution_consent, document_type: 'Environmental Clearance Certificate', mandatory: true, condition: null },
    { id: 'dr-pc-process', approval_type_id: IDs.at_pollution_consent, document_type: 'Process Flow Diagram', mandatory: true, condition: null },
    { id: 'dr-pc-effluent', approval_type_id: IDs.at_pollution_consent, document_type: 'Effluent Treatment Plan', mandatory: true, condition: null },

    // Fire NOC
    { id: 'dr-fn-drawing', approval_type_id: IDs.at_fire_noc, document_type: 'Fire Safety Layout Drawing', mandatory: true, condition: null },
    { id: 'dr-fn-pan', approval_type_id: IDs.at_fire_noc, document_type: 'Company PAN Card', mandatory: false, condition: null },

    // Factory License
    { id: 'dr-fl-pan', approval_type_id: IDs.at_factory_license, document_type: 'Company PAN Card', mandatory: true, condition: null },
    { id: 'dr-fl-cte', approval_type_id: IDs.at_factory_license, document_type: 'Pollution Consent to Establish Certificate', mandatory: true, condition: null },
    { id: 'dr-fl-building', approval_type_id: IDs.at_factory_license, document_type: 'Building Plan Approval Letter', mandatory: true, condition: null },
    { id: 'dr-fl-insurance', approval_type_id: IDs.at_factory_license, document_type: 'Workers Compensation Insurance', mandatory: true, condition: null },

    // FSSAI
    { id: 'dr-fs-pan', approval_type_id: IDs.at_fssai_license, document_type: 'Company PAN Card', mandatory: true, condition: null },
    { id: 'dr-fs-factory', approval_type_id: IDs.at_fssai_license, document_type: 'Factory License Copy', mandatory: true, condition: null },
    { id: 'dr-fs-layout', approval_type_id: IDs.at_fssai_license, document_type: 'Food Processing Unit Layout', mandatory: true, condition: null },

    // Electricity Connection
    { id: 'dr-ec-pan', approval_type_id: IDs.at_electricity_connection, document_type: 'Company PAN Card', mandatory: true, condition: null },
    { id: 'dr-ec-building', approval_type_id: IDs.at_electricity_connection, document_type: 'Building Plan Approval Letter', mandatory: true, condition: null },
    { id: 'dr-ec-load', approval_type_id: IDs.at_electricity_connection, document_type: 'Load Requirement Details', mandatory: true, condition: null },

    // Water Connection
    { id: 'dr-wc-land', approval_type_id: IDs.at_water_connection, document_type: 'Land Ownership / Lease Agreement', mandatory: true, condition: null },
    { id: 'dr-wc-layout', approval_type_id: IDs.at_water_connection, document_type: 'Site Layout Plan', mandatory: false, condition: null },
  ];

  for (const req of reqs) {
    await prisma.documentRequirement.upsert({
      where: { id: req.id },
      update: {},
      create: req,
    });
  }
}

// ---------------------------------------------------------------------------
// 7. ApprovalDependencies
// ---------------------------------------------------------------------------
async function seedDependencies() {
  const deps = [
    {
      id: IDs.dep_pollution_needs_env,
      prerequisite_approval_type_id: IDs.at_env_clearance,
      dependent_approval_type_id: IDs.at_pollution_consent,
      dependency_type: 'PREREQUISITE' as DependencyType,
    },
    {
      id: IDs.dep_factory_needs_pollution,
      prerequisite_approval_type_id: IDs.at_pollution_consent,
      dependent_approval_type_id: IDs.at_factory_license,
      dependency_type: 'PREREQUISITE' as DependencyType,
    },
    {
      id: IDs.dep_factory_needs_building,
      prerequisite_approval_type_id: IDs.at_building_plan_approval,
      dependent_approval_type_id: IDs.at_factory_license,
      dependency_type: 'PREREQUISITE' as DependencyType,
    },
    {
      id: IDs.dep_fssai_needs_factory,
      prerequisite_approval_type_id: IDs.at_factory_license,
      dependent_approval_type_id: IDs.at_fssai_license,
      dependency_type: 'PREREQUISITE' as DependencyType,
    },
    {
      id: IDs.dep_electricity_needs_building,
      prerequisite_approval_type_id: IDs.at_building_plan_approval,
      dependent_approval_type_id: IDs.at_electricity_connection,
      dependency_type: 'PREREQUISITE' as DependencyType,
    },
  ];

  for (const dep of deps) {
    await prisma.approvalDependency.upsert({
      where: {
        prerequisite_approval_type_id_dependent_approval_type_id: {
          prerequisite_approval_type_id: dep.prerequisite_approval_type_id,
          dependent_approval_type_id: dep.dependent_approval_type_id,
        },
      },
      update: {},
      create: dep,
    });
  }
}

// ---------------------------------------------------------------------------
// 8. SLA Policies
// ---------------------------------------------------------------------------
async function seedSLAPolicies() {
  const policies = [
    { id: IDs.sla_env, approval_type_id: IDs.at_env_clearance, duration_days: 90, start_event: 'application_submitted', escalation_level: 'HIGH' },
    { id: IDs.sla_building, approval_type_id: IDs.at_building_plan_approval, duration_days: 45, start_event: 'application_submitted', escalation_level: 'MEDIUM' },
    { id: IDs.sla_pollution, approval_type_id: IDs.at_pollution_consent, duration_days: 60, start_event: 'application_submitted', escalation_level: 'HIGH' },
    { id: IDs.sla_fire_noc, approval_type_id: IDs.at_fire_noc, duration_days: 30, start_event: 'application_submitted', escalation_level: 'MEDIUM' },
    { id: IDs.sla_factory, approval_type_id: IDs.at_factory_license, duration_days: 30, start_event: 'application_submitted', escalation_level: 'MEDIUM' },
    { id: IDs.sla_electricity, approval_type_id: IDs.at_electricity_connection, duration_days: 45, start_event: 'application_submitted', escalation_level: 'LOW' },
    { id: IDs.sla_labour, approval_type_id: IDs.at_labour_registration, duration_days: 15, start_event: 'application_submitted', escalation_level: 'LOW' },
    { id: IDs.sla_fssai, approval_type_id: IDs.at_fssai_license, duration_days: 60, start_event: 'application_submitted', escalation_level: 'MEDIUM' },
    { id: IDs.sla_water, approval_type_id: IDs.at_water_connection, duration_days: 30, start_event: 'application_submitted', escalation_level: 'LOW' },
    { id: IDs.sla_trade, approval_type_id: IDs.at_trade_license, duration_days: 21, start_event: 'application_submitted', escalation_level: 'LOW' },
  ];

  for (const pol of policies) {
    await prisma.sLAPolicy.upsert({
      where: { id: pol.id },
      update: {},
      create: pol,
    });
  }
}

// ---------------------------------------------------------------------------
// 9. ProjectApprovals — varied statuses for demo storyline
// ---------------------------------------------------------------------------
async function seedProjectApprovals(projectId: string) {
  const REASON_PREFIX = 'Matched because the project is a food-processing manufacturing project in Maharashtra (MIDC, Pune). This is demonstration / configurable regulatory data.';

  const approvals: Array<{
    id: string;
    project_id: string;
    approval_type_id: string;
    applicability_reason: string;
    status: ProjectApprovalStatus;
    priority: Priority;
    due_date?: Date;
    actual_completion_date?: Date;
    blocked_reason?: string;
  }> = [
    // Completed
    {
      id: IDs.pa_env,
      project_id: projectId,
      approval_type_id: IDs.at_env_clearance,
      applicability_reason: `${REASON_PREFIX} Environmental Clearance is required under the Environment (Protection) Act for food-processing projects with investment above ₹10 Crore in Maharashtra.`,
      status: 'COMPLETED',
      priority: 'HIGH',
      due_date: daysAgo(30),
      actual_completion_date: daysAgo(35),
    },
    // Completed
    {
      id: IDs.pa_building,
      project_id: projectId,
      approval_type_id: IDs.at_building_plan_approval,
      applicability_reason: `${REASON_PREFIX} Building Plan Approval is required by MIDC before commencing construction on allotted industrial plots.`,
      status: 'COMPLETED',
      priority: 'HIGH',
      due_date: daysAgo(20),
      actual_completion_date: daysAgo(25),
    },
    // In Progress (under review)
    {
      id: IDs.pa_pollution,
      project_id: projectId,
      approval_type_id: IDs.at_pollution_consent,
      applicability_reason: `${REASON_PREFIX} Pollution Consent to Establish (CTE) is mandatory from MPCB for food processing industries, as wastewater and effluent generation require regulatory oversight.`,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      due_date: daysFromNow(10),
    },
    // In Progress (query raised)
    {
      id: IDs.pa_fire_noc,
      project_id: projectId,
      approval_type_id: IDs.at_fire_noc,
      applicability_reason: `${REASON_PREFIX} Fire NOC is required under the Pune Municipal Corporation bye-laws for industrial manufacturing premises employing 10 or more workers.`,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      due_date: daysFromNow(5),
    },
    // BLOCKED (prerequisite pollution consent in progress)
    {
      id: IDs.pa_factory,
      project_id: projectId,
      approval_type_id: IDs.at_factory_license,
      applicability_reason: `${REASON_PREFIX} Factory License under the Factories Act 1948 is mandatory for all manufacturing units with 10 or more workers using power.`,
      status: 'BLOCKED',
      priority: 'HIGH',
      due_date: daysFromNow(45),
      blocked_reason: 'Waiting for Pollution Consent to Establish (CTE) and Building Plan Approval — both are prerequisites for the Factory License application.',
    },
    // Not started — can start now (no prerequisites)
    {
      id: IDs.pa_labour,
      project_id: projectId,
      approval_type_id: IDs.at_labour_registration,
      applicability_reason: `${REASON_PREFIX} Contract Labour Registration is required under the Contract Labour (Regulation and Abolition) Act for establishments employing 20 or more contract workers.`,
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      due_date: daysFromNow(90),
    },
    // Not started — can start now (no prerequisites for this project)
    {
      id: IDs.pa_water,
      project_id: projectId,
      approval_type_id: IDs.at_water_connection,
      applicability_reason: `${REASON_PREFIX} MIDC Water Connection is required for all industries established in MIDC areas to access the industrial water supply network.`,
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      due_date: daysFromNow(60),
    },
    // Not started — blocked on factory
    {
      id: IDs.pa_fssai,
      project_id: projectId,
      approval_type_id: IDs.at_fssai_license,
      applicability_reason: `${REASON_PREFIX} FSSAI Food Business Operator License is mandatory for all food manufacturing units before commencing food production activities.`,
      status: 'NOT_STARTED',
      priority: 'HIGH',
      due_date: daysFromNow(120),
    },
    // Not started — blocked on building
    {
      id: IDs.pa_electricity,
      project_id: projectId,
      approval_type_id: IDs.at_electricity_connection,
      applicability_reason: `${REASON_PREFIX} Industrial Electricity Connection from MSEDCL is required to power the manufacturing facility after Building Plan Approval is obtained.`,
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      due_date: daysFromNow(75),
    },
    // Not started
    {
      id: IDs.pa_trade,
      project_id: projectId,
      approval_type_id: IDs.at_trade_license,
      applicability_reason: `${REASON_PREFIX} Trade License from Pune Municipal Corporation is required for conducting commercial and manufacturing activities within the Pune district.`,
      status: 'NOT_STARTED',
      priority: 'LOW',
      due_date: daysFromNow(100),
    },
  ];

  for (const pa of approvals) {
    await prisma.projectApproval.upsert({
      where: { id: pa.id },
      update: { status: pa.status, blocked_reason: pa.blocked_reason ?? null },
      create: pa,
    });
  }
}

// ---------------------------------------------------------------------------
// 10. Documents (vault)
// ---------------------------------------------------------------------------
async function seedDocuments(orgId: string, projectId: string) {
  const documents = [
    {
      id: IDs.doc_pan,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Company PAN Card',
      file_name: 'abc_foods_pan_card.pdf',
      file_url: '/uploads/demo/pan_card.pdf',
      version: 1,
      verification_status: 'VERIFIED' as DocumentVerificationStatus,
      issued_date: daysAgo(365),
      expiry_date: null,
    },
    {
      id: IDs.doc_land_title,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Land Ownership / Lease Agreement',
      file_name: 'midc_lease_agreement_plot42.pdf',
      file_url: '/uploads/demo/lease_agreement.pdf',
      version: 1,
      verification_status: 'VERIFIED' as DocumentVerificationStatus,
      issued_date: daysAgo(180),
      expiry_date: daysFromNow(720),
    },
    {
      id: IDs.doc_mou,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Memorandum of Association (MoA)',
      file_name: 'abc_foods_moa.pdf',
      file_url: '/uploads/demo/moa.pdf',
      version: 1,
      verification_status: 'VERIFIED' as DocumentVerificationStatus,
      issued_date: daysAgo(730),
      expiry_date: null,
    },
    {
      id: IDs.doc_env_report,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Environmental Impact Assessment Report',
      file_name: 'eia_report_abc_foods_v2.pdf',
      file_url: '/uploads/demo/eia_report.pdf',
      version: 2,
      verification_status: 'VERIFIED' as DocumentVerificationStatus,
      issued_date: daysAgo(90),
      expiry_date: daysFromNow(365),
    },
    {
      id: IDs.doc_building_drawing,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Architectural / Structural Drawings',
      file_name: 'building_plan_plot42_midc.pdf',
      file_url: '/uploads/demo/building_plan.pdf',
      version: 1,
      verification_status: 'VERIFIED' as DocumentVerificationStatus,
      issued_date: daysAgo(60),
      expiry_date: null,
    },
    // Expiring soon
    {
      id: IDs.doc_pollution_certificate,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Pollution Consent to Establish Certificate',
      file_name: 'mpcb_cte_certificate.pdf',
      file_url: '/uploads/demo/cte_cert.pdf',
      version: 1,
      verification_status: 'PENDING' as DocumentVerificationStatus,
      issued_date: daysAgo(5),
      expiry_date: daysFromNow(25), // expiring in 25 days — triggers warning
    },
    // Missing — fire safety drawing uploaded but not verified
    {
      id: IDs.doc_fire_drawing,
      org_id: orgId,
      project_id: projectId,
      document_type: 'Fire Safety Layout Drawing',
      file_name: 'fire_safety_layout_abc_foods.pdf',
      file_url: '/uploads/demo/fire_safety.pdf',
      version: 1,
      verification_status: 'PENDING' as DocumentVerificationStatus,
      issued_date: daysAgo(3),
      expiry_date: null,
    },
  ];

  for (const doc of documents) {
    await prisma.document.upsert({
      where: { id: doc.id },
      update: {},
      create: doc,
    });
  }
}

// ---------------------------------------------------------------------------
// 11. Applications
// ---------------------------------------------------------------------------
async function seedApplications() {
  const applications = [
    // APPROVED (env clearance)
    {
      id: IDs.app_env,
      project_approval_id: IDs.pa_env,
      department_id: IDs.dept_midc,
      application_number: 'APP-ENV-2024-001',
      status: 'APPROVED' as ApplicationStatus,
      submitted_at: daysAgo(80),
      due_date: daysAgo(30),
      completed_at: daysAgo(35),
    },
    // APPROVED (building plan)
    {
      id: IDs.app_building,
      project_approval_id: IDs.pa_building,
      department_id: IDs.dept_midc,
      application_number: 'APP-BP-2024-002',
      status: 'APPROVED' as ApplicationStatus,
      submitted_at: daysAgo(50),
      due_date: daysAgo(20),
      completed_at: daysAgo(25),
    },
    // UNDER_REVIEW (pollution)
    {
      id: IDs.app_pollution,
      project_approval_id: IDs.pa_pollution,
      department_id: IDs.dept_pcb,
      application_number: 'APP-PCB-2024-003',
      status: 'UNDER_REVIEW' as ApplicationStatus,
      submitted_at: daysAgo(30),
      due_date: daysFromNow(10),
      completed_at: null,
    },
    // QUERY_RAISED (fire NOC)
    {
      id: IDs.app_fire_noc,
      project_approval_id: IDs.pa_fire_noc,
      department_id: IDs.dept_fire,
      application_number: 'APP-FIRE-2024-004',
      status: 'QUERY_RAISED' as ApplicationStatus,
      submitted_at: daysAgo(20),
      due_date: daysFromNow(5),
      completed_at: null,
    },
    // IN_PREPARATION (factory — blocked)
    {
      id: IDs.app_factory,
      project_approval_id: IDs.pa_factory,
      department_id: IDs.dept_labour,
      application_number: 'APP-FAC-2024-005',
      status: 'IN_PREPARATION' as ApplicationStatus,
      submitted_at: null,
      due_date: daysFromNow(45),
      completed_at: null,
    },
    // IN_PREPARATION (fssai)
    {
      id: IDs.app_fssai,
      project_approval_id: IDs.pa_fssai,
      department_id: IDs.dept_fssai,
      application_number: 'APP-FSSAI-2024-006',
      status: 'IN_PREPARATION' as ApplicationStatus,
      submitted_at: null,
      due_date: daysFromNow(120),
      completed_at: null,
    },
    // INSPECTION_SCHEDULED (electricity)
    {
      id: IDs.app_electricity,
      project_approval_id: IDs.pa_electricity,
      department_id: IDs.dept_electricity,
      application_number: 'APP-ELEC-2024-007',
      status: 'INSPECTION_SCHEDULED' as ApplicationStatus,
      submitted_at: daysAgo(15),
      due_date: daysFromNow(30),
      completed_at: null,
    },
  ];

  for (const app of applications) {
    await prisma.application.upsert({
      where: { id: app.id },
      update: { status: app.status },
      create: app,
    });
  }
}

// ---------------------------------------------------------------------------
// 12. ApplicationDocuments (linking documents to applications)
// ---------------------------------------------------------------------------
async function seedApplicationDocuments() {
  const links = [
    // env clearance app
    { id: 'ad-env-pan', application_id: IDs.app_env, document_id: IDs.doc_pan, validation_status: 'VALID' as ApplicationDocValidationStatus },
    { id: 'ad-env-land', application_id: IDs.app_env, document_id: IDs.doc_land_title, validation_status: 'VALID' as ApplicationDocValidationStatus },
    { id: 'ad-env-moa', application_id: IDs.app_env, document_id: IDs.doc_mou, validation_status: 'VALID' as ApplicationDocValidationStatus },
    { id: 'ad-env-eia', application_id: IDs.app_env, document_id: IDs.doc_env_report, validation_status: 'VALID' as ApplicationDocValidationStatus },
    // building plan app (reusing pan + land)
    { id: 'ad-bp-pan', application_id: IDs.app_building, document_id: IDs.doc_pan, validation_status: 'VALID' as ApplicationDocValidationStatus },
    { id: 'ad-bp-land', application_id: IDs.app_building, document_id: IDs.doc_land_title, validation_status: 'VALID' as ApplicationDocValidationStatus },
    { id: 'ad-bp-drawing', application_id: IDs.app_building, document_id: IDs.doc_building_drawing, validation_status: 'VALID' as ApplicationDocValidationStatus },
    // pollution app
    { id: 'ad-pol-pan', application_id: IDs.app_pollution, document_id: IDs.doc_pan, validation_status: 'VALID' as ApplicationDocValidationStatus },
    { id: 'ad-pol-land', application_id: IDs.app_pollution, document_id: IDs.doc_land_title, validation_status: 'VALID' as ApplicationDocValidationStatus },
    // fire noc app (fire drawing pending — triggers readiness warning)
    { id: 'ad-fire-draw', application_id: IDs.app_fire_noc, document_id: IDs.doc_fire_drawing, validation_status: 'PENDING' as ApplicationDocValidationStatus },
  ];

  for (const link of links) {
    await prisma.applicationDocument.upsert({
      where: { id: link.id },
      update: {},
      create: link,
    });
  }
}

// ---------------------------------------------------------------------------
// 13. ApplicationEvents (timeline)
// ---------------------------------------------------------------------------
async function seedApplicationEvents() {
  const events = [
    // Env clearance timeline
    { id: 'ae-env-1', application_id: IDs.app_env, actor_id: 'user-entrepreneur', event_type: 'application_created', timestamp: daysAgo(85), notes: 'Application created for Environmental Clearance.' },
    { id: 'ae-env-2', application_id: IDs.app_env, actor_id: 'user-entrepreneur', event_type: 'status_changed:SUBMITTED', timestamp: daysAgo(80), notes: 'Application submitted to SEIAA.' },
    { id: 'ae-env-3', application_id: IDs.app_env, actor_id: 'user-officer', event_type: 'status_changed:UNDER_REVIEW', timestamp: daysAgo(75), notes: 'Application received and under preliminary scrutiny.' },
    { id: 'ae-env-4', application_id: IDs.app_env, actor_id: 'user-inspector', event_type: 'inspection_scheduled', timestamp: daysAgo(60), notes: 'Site inspection scheduled for environmental impact assessment.' },
    { id: 'ae-env-5', application_id: IDs.app_env, actor_id: 'user-inspector', event_type: 'inspection_completed', timestamp: daysAgo(50), notes: 'Site inspection completed. Report submitted to authority.' },
    { id: 'ae-env-6', application_id: IDs.app_env, actor_id: 'user-officer', event_type: 'status_changed:APPROVED', timestamp: daysAgo(35), notes: 'Environmental Clearance approved by SEIAA.' },
    // Building plan timeline
    { id: 'ae-bp-1', application_id: IDs.app_building, actor_id: 'user-entrepreneur', event_type: 'application_created', timestamp: daysAgo(55), notes: 'Building plan submitted to MIDC.' },
    { id: 'ae-bp-2', application_id: IDs.app_building, actor_id: 'user-entrepreneur', event_type: 'status_changed:SUBMITTED', timestamp: daysAgo(50), notes: 'Building plan drawings submitted.' },
    { id: 'ae-bp-3', application_id: IDs.app_building, actor_id: 'user-officer', event_type: 'status_changed:APPROVED', timestamp: daysAgo(25), notes: 'Building plan approved by MIDC planning authority.' },
    // Pollution CTE timeline
    { id: 'ae-pol-1', application_id: IDs.app_pollution, actor_id: 'user-entrepreneur', event_type: 'application_created', timestamp: daysAgo(35), notes: 'Pollution Consent to Establish application initiated.' },
    { id: 'ae-pol-2', application_id: IDs.app_pollution, actor_id: 'user-entrepreneur', event_type: 'status_changed:SUBMITTED', timestamp: daysAgo(30), notes: 'Application submitted to MPCB online portal.' },
    { id: 'ae-pol-3', application_id: IDs.app_pollution, actor_id: 'user-pcb-officer', event_type: 'status_changed:UNDER_REVIEW', timestamp: daysAgo(25), notes: 'MPCB has commenced review of the application.' },
    // Fire NOC timeline
    { id: 'ae-fire-1', application_id: IDs.app_fire_noc, actor_id: 'user-entrepreneur', event_type: 'application_created', timestamp: daysAgo(25), notes: 'Fire NOC application initiated.' },
    { id: 'ae-fire-2', application_id: IDs.app_fire_noc, actor_id: 'user-entrepreneur', event_type: 'status_changed:SUBMITTED', timestamp: daysAgo(20), notes: 'Application submitted to PMC Fire Department.' },
    { id: 'ae-fire-3', application_id: IDs.app_fire_noc, actor_id: 'user-officer', event_type: 'status_changed:QUERY_RAISED', timestamp: daysAgo(10), notes: 'Query raised by fire department regarding emergency exit dimensions.' },
  ];

  for (const ev of events) {
    await prisma.applicationEvent.upsert({
      where: { id: ev.id },
      update: {},
      create: ev,
    });
  }
}

// ---------------------------------------------------------------------------
// 14. Queries
// ---------------------------------------------------------------------------
async function seedQueries() {
  // Open query on Fire NOC
  const q1 = await prisma.query.upsert({
    where: { id: IDs.query_env_docs },
    update: {},
    create: {
      id: IDs.query_env_docs,
      application_id: IDs.app_fire_noc,
      created_by: 'user-officer',
      assigned_to: 'user-entrepreneur',
      subject: 'Fire Safety Drawing — Emergency Exit Dimensions',
      description: 'The submitted Fire Safety Layout Drawing does not clearly indicate the width and height of all emergency exit doors. Per NBC 2016 norms, all emergency exits must be minimum 1.5m wide. Please provide a revised drawing with clearly marked exit dimensions, or submit a technical clarification note.',
      priority: 'HIGH' as Priority,
      deadline: daysFromNow(3),
      status: 'OPEN' as QueryStatus,
    },
  });

  // Response from applicant
  await prisma.queryResponse.upsert({
    where: { id: 'qr-fire-1' },
    update: {},
    create: {
      id: 'qr-fire-1',
      query_id: q1.id,
      created_by: 'user-entrepreneur',
      response_text: 'Thank you for the query. We acknowledge that the emergency exit dimensions were missing from the original drawing. Our architect is preparing a revised drawing with all exit dimensions clearly marked as per NBC 2016 norms. We will upload the revised Fire Safety Layout Drawing within 2 working days. We request a brief extension of the deadline if needed.',
      created_at: daysAgo(8),
    },
  });

  // Resolved query on pollution application
  const q2 = await prisma.query.upsert({
    where: { id: IDs.query_pollution_tech },
    update: {},
    create: {
      id: IDs.query_pollution_tech,
      application_id: IDs.app_pollution,
      created_by: 'user-pcb-officer',
      assigned_to: 'user-entrepreneur',
      subject: 'Effluent Treatment Plant Capacity Details',
      description: 'Please provide the design capacity of the proposed Effluent Treatment Plant (ETP) in terms of kilolitres per day (KLD) and the list of treatment stages included.',
      priority: 'MEDIUM' as Priority,
      deadline: daysAgo(5),
      status: 'RESOLVED' as QueryStatus,
    },
  });

  await prisma.queryResponse.upsert({
    where: { id: 'qr-pol-1' },
    update: {},
    create: {
      id: 'qr-pol-1',
      query_id: q2.id,
      created_by: 'user-entrepreneur',
      response_text: 'ETP design capacity: 15 KLD. Treatment stages: screening, equalization, coagulation-flocculation, bio-treatment (activated sludge), secondary clarification, tertiary filtration, and solar evaporation of residual sludge. Detailed ETP design report attached.',
      created_at: daysAgo(10),
    },
  });
}

// ---------------------------------------------------------------------------
// 15. Inspections
// ---------------------------------------------------------------------------
async function seedInspections() {
  // Scheduled inspection for electricity connection app
  const insp = await prisma.inspection.upsert({
    where: { id: IDs.insp_factory },
    update: {},
    create: {
      id: IDs.insp_factory,
      application_id: IDs.app_electricity,
      department_id: IDs.dept_electricity,
      inspector_id: 'user-inspector',
      scheduled_date: daysFromNow(7),
      status: 'SCHEDULED' as InspectionStatus,
      location: 'Plot No. 42, MIDC Bhosari, Pune 411026',
      purpose: 'Site inspection for load verification and infrastructure readiness assessment before sanctioning industrial electricity connection.',
    },
  });

  // Completed inspection (env clearance)
  await prisma.inspection.upsert({
    where: { id: 'insp-env-001' },
    update: {},
    create: {
      id: 'insp-env-001',
      application_id: IDs.app_env,
      department_id: IDs.dept_midc,
      inspector_id: 'user-inspector',
      scheduled_date: daysAgo(52),
      status: 'COMPLETED' as InspectionStatus,
      location: 'Plot No. 42, MIDC Bhosari, Pune 411026',
      purpose: 'Environmental impact assessment site inspection.',
    },
  });

  // Inspection finding (completed env inspection)
  await prisma.inspectionFinding.upsert({
    where: { id: 'if-env-001' },
    update: {},
    create: {
      id: 'if-env-001',
      inspection_id: 'insp-env-001',
      severity: 'LOW' as FindingSeverity,
      description: 'Minor: Site boundary markers not clearly visible. Recommend installing boundary indicators.',
      corrective_action: 'Install permanent boundary pillars at all four corners of the plot.',
      status: 'resolved',
    },
  });

  return insp;
}

// ---------------------------------------------------------------------------
// 16. SLA Instances
// ---------------------------------------------------------------------------
async function seedSLAInstances() {
  const instances = [
    // Env — COMPLETED
    {
      id: IDs.sla_inst_env,
      application_id: IDs.app_env,
      due_date: daysAgo(30),
      status: 'COMPLETED' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
    // Building — COMPLETED
    {
      id: IDs.sla_inst_building,
      application_id: IDs.app_building,
      due_date: daysAgo(20),
      status: 'COMPLETED' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
    // Pollution — AT_RISK (due in 10 days, submitted 30 days ago, 60-day SLA)
    {
      id: IDs.sla_inst_pollution,
      application_id: IDs.app_pollution,
      due_date: daysFromNow(10),
      status: 'AT_RISK' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
    // Fire NOC — AT_RISK (due in 5 days)
    {
      id: IDs.sla_inst_fire,
      application_id: IDs.app_fire_noc,
      due_date: daysFromNow(5),
      status: 'AT_RISK' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
    // Factory — ON_TRACK (not submitted yet, in preparation)
    {
      id: IDs.sla_inst_factory,
      application_id: IDs.app_factory,
      due_date: daysFromNow(45),
      status: 'ON_TRACK' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
    // FSSAI — ON_TRACK
    {
      id: IDs.sla_inst_fssai,
      application_id: IDs.app_fssai,
      due_date: daysFromNow(120),
      status: 'ON_TRACK' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
    // Electricity — ON_TRACK
    {
      id: IDs.sla_inst_electricity,
      application_id: IDs.app_electricity,
      due_date: daysFromNow(30),
      status: 'ON_TRACK' as SLAStatus,
      breached: false,
      breach_duration: null,
    },
  ];

  for (const inst of instances) {
    await prisma.sLAInstance.upsert({
      where: { id: inst.id },
      update: { status: inst.status },
      create: inst,
    });
  }
}

// ---------------------------------------------------------------------------
// 17. IncentiveSchemes + Matches
// ---------------------------------------------------------------------------
async function seedIncentives(projectId: string) {
  const schemes = [
    {
      id: IDs.inc_package_2019,
      name: 'Maharashtra Package Scheme of Incentives (PSI) 2019',
      authority: 'Government of Maharashtra — Industries Department',
      description: 'Capital subsidy and incentive package for new manufacturing units in Maharashtra.',
      eligibility_rules: [
        { field: 'sector', operator: 'eq', value: 'Food Processing' },
        { field: 'investment_amount', operator: 'gte', value: 1_00_00_000 },
      ],
      benefit_description: 'Up to 30% capital subsidy on eligible fixed assets. Stamp duty exemption, electricity duty exemption for 7 years, and employment incentive for local hiring.',
      deadline: daysFromNow(365),
      source_reference: 'Demonstration data — refer to industries.maharashtra.gov.in for current scheme details.',
    },
    {
      id: IDs.inc_msme_subsidy,
      name: 'MSME Technology Upgradation Scheme',
      authority: 'Ministry of MSME, Government of India',
      description: 'Credit-linked subsidy for technology upgradation in food processing MSMEs.',
      eligibility_rules: [
        { field: 'sector', operator: 'eq', value: 'Food Processing' },
        { field: 'investment_amount', operator: 'lte', value: 50_00_00_000 },
        { field: 'employee_count', operator: 'lte', value: 250 },
      ],
      benefit_description: '15% credit-linked capital subsidy on institutional finance for eligible plant and machinery.',
      deadline: null,
      source_reference: 'Demonstration data — refer to msme.gov.in for current scheme details.',
    },
    {
      id: IDs.inc_food_park,
      name: 'Pradhan Mantri Kisan Sampada Yojana — Food Park Subsidy',
      authority: 'Ministry of Food Processing Industries, Government of India',
      description: 'Financial assistance for setting up modern food processing infrastructure.',
      eligibility_rules: [
        { field: 'sector', operator: 'eq', value: 'Food Processing' },
        { field: 'industrial_area', operator: 'eq', value: 'MIDC' },
      ],
      benefit_description: 'Grant assistance of up to 50% of project cost for food processing units in designated areas.',
      deadline: daysFromNow(180),
      source_reference: 'Demonstration data — refer to mofpi.gov.in for current scheme details.',
    },
    {
      id: IDs.inc_employment,
      name: 'Employment Generation Subsidy Scheme (EGSS)',
      authority: 'Government of Maharashtra — Skill Development Department',
      description: 'Employment subsidy for new manufacturing units creating local employment in Maharashtra.',
      eligibility_rules: [
        { field: 'employee_count', operator: 'gte', value: 50 },
        { field: 'stage', operator: 'eq', value: 'pre_establishment' },
      ],
      benefit_description: 'Monthly reimbursement of PF/ESI employer contribution for local employees for up to 3 years.',
      deadline: null,
      source_reference: 'Demonstration data — refer to maharashtraskill.gov.in for current scheme details.',
    },
  ];

  for (const scheme of schemes) {
    await prisma.incentiveScheme.upsert({
      where: { id: scheme.id },
      update: {},
      create: scheme as never,
    });
  }

  // IncentiveMatch rows
  const matches = [
    {
      id: IDs.im_package,
      project_id: projectId,
      incentive_scheme_id: IDs.inc_package_2019,
      matching_reasons: ['Project is in Food Processing sector', 'Investment of ₹25 Crore meets the minimum ₹1 Crore threshold'],
      status: 'POTENTIALLY_ELIGIBLE' as IncentiveMatchStatus,
    },
    {
      id: IDs.im_msme,
      project_id: projectId,
      incentive_scheme_id: IDs.inc_msme_subsidy,
      matching_reasons: ['Food Processing sector matches', 'Investment ₹25 Crore is below ₹50 Crore limit', '80 employees is below 250 employee limit'],
      status: 'POTENTIALLY_ELIGIBLE' as IncentiveMatchStatus,
    },
    {
      id: IDs.im_food_park,
      project_id: projectId,
      incentive_scheme_id: IDs.inc_food_park,
      matching_reasons: ['Food Processing sector matches', 'Project is in MIDC industrial area'],
      status: 'POTENTIALLY_ELIGIBLE' as IncentiveMatchStatus,
    },
    {
      id: IDs.im_employment,
      project_id: projectId,
      incentive_scheme_id: IDs.inc_employment,
      matching_reasons: ['80 employees meets the 50 minimum threshold', 'Project is in pre-establishment stage'],
      status: 'POTENTIALLY_ELIGIBLE' as IncentiveMatchStatus,
    },
  ];

  for (const match of matches) {
    await prisma.incentiveMatch.upsert({
      where: { id: match.id },
      update: {},
      create: match as never,
    });
  }
}

// ---------------------------------------------------------------------------
// 18. ComplianceRequirements (renewals)
// ---------------------------------------------------------------------------
async function seedCompliance(projectId: string) {
  const reqs = [
    {
      id: IDs.comp_pollution_renewal,
      project_id: projectId,
      name: 'MPCB Pollution Consent to Operate — Annual Renewal',
      authority: 'Maharashtra Pollution Control Board',
      frequency: 'Annual',
      next_due_date: daysFromNow(340),
      status: 'UPCOMING' as ComplianceStatus,
      linked_approval_id: IDs.at_pollution_consent,
    },
    {
      id: IDs.comp_factory_renewal,
      project_id: projectId,
      name: 'Factory License — Annual Renewal',
      authority: 'Maharashtra Labour Department',
      frequency: 'Annual',
      next_due_date: daysFromNow(365),
      status: 'UPCOMING' as ComplianceStatus,
      linked_approval_id: IDs.at_factory_license,
    },
    {
      id: IDs.comp_fssai_renewal,
      project_id: projectId,
      name: 'FSSAI FBO License — Annual Renewal',
      authority: 'Food Safety and Standards Authority of India',
      frequency: 'Annual',
      next_due_date: daysFromNow(395),
      status: 'UPCOMING' as ComplianceStatus,
      linked_approval_id: IDs.at_fssai_license,
    },
    {
      id: IDs.comp_fire_renewal,
      project_id: projectId,
      name: 'Fire NOC — Annual Renewal',
      authority: 'Pune Municipal Corporation — Fire Department',
      frequency: 'Annual',
      next_due_date: daysFromNow(330),
      status: 'UPCOMING' as ComplianceStatus,
      linked_approval_id: IDs.at_fire_noc,
    },
  ];

  for (const req of reqs) {
    await prisma.complianceRequirement.upsert({
      where: { id: req.id },
      update: {},
      create: req,
    });
  }
}

// ---------------------------------------------------------------------------
// 19. Notifications
// ---------------------------------------------------------------------------
async function seedNotifications() {
  const notifs = [
    { id: 'notif-1', user_id: 'user-entrepreneur', title: 'Environmental Clearance Approved', message: 'Your Environmental Clearance application (APP-ENV-2024-001) has been approved by SEIAA. You may now proceed with the Pollution Consent to Establish application.', type: 'success', read: true },
    { id: 'notif-2', user_id: 'user-entrepreneur', title: 'Query Raised — Fire NOC Application', message: 'The Fire Department has raised a query on your Fire NOC application (APP-FIRE-2024-004) regarding emergency exit dimensions. Please respond within 3 days to avoid SLA breach.', type: 'warning', read: false },
    { id: 'notif-3', user_id: 'user-entrepreneur', title: 'SLA At Risk — Pollution Consent CTE', message: 'The configured SLA for your Pollution Consent to Establish application (APP-PCB-2024-003) is at risk. Due date: 10 days from today. Action may be required.', type: 'alert', read: false },
    { id: 'notif-4', user_id: 'user-entrepreneur', title: 'Inspection Scheduled — Electricity Connection', message: 'A site inspection for your Electricity Connection application has been scheduled for 7 days from now. Location: Plot No. 42, MIDC Bhosari, Pune.', type: 'info', read: false },
    { id: 'notif-5', user_id: 'user-entrepreneur', title: 'Document Expiring Soon — Pollution Certificate', message: 'Your uploaded Pollution Consent to Establish Certificate expires in 25 days. Please renew and upload the updated document before expiry to avoid application delays.', type: 'warning', read: false },
    { id: 'notif-6', user_id: 'user-officer', title: 'New Application — Pollution CTE Review', message: 'Application APP-PCB-2024-003 from ABC Foods Pvt Ltd is under review. SLA due in 10 days.', type: 'info', read: false },
    { id: 'notif-7', user_id: 'user-officer', title: 'SLA At Risk — Fire NOC', message: 'Application APP-FIRE-2024-004 SLA is at risk. Due date: 5 days from today. A query is open.', type: 'alert', read: false },
  ];

  for (const notif of notifs) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: {},
      create: {
        id: notif.id,
        user_id: notif.user_id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        read: notif.read,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 20. AuditLog
// ---------------------------------------------------------------------------
async function seedAuditLog() {
  const entries = [
    { id: 'al-1', actor_id: 'user-entrepreneur', action: 'project_created', entity_type: 'Project', entity_id: IDs.project, after_data: { name: 'ABC Foods Pvt Ltd — New Food Processing Unit', sector: 'Food Processing' } },
    { id: 'al-2', actor_id: 'user-entrepreneur', action: 'regulatory_analysis_run', entity_type: 'Project', entity_id: IDs.project, after_data: { approvals_generated: 10 } },
    { id: 'al-3', actor_id: 'user-entrepreneur', action: 'application_submitted', entity_type: 'Application', entity_id: IDs.app_env, after_data: { application_number: 'APP-ENV-2024-001', status: 'SUBMITTED' } },
    { id: 'al-4', actor_id: 'user-officer', action: 'application_status_changed', entity_type: 'Application', entity_id: IDs.app_env, before_data: { status: 'UNDER_REVIEW' }, after_data: { status: 'APPROVED' } },
    { id: 'al-5', actor_id: 'user-officer', action: 'query_raised', entity_type: 'Query', entity_id: IDs.query_env_docs, after_data: { subject: 'Fire Safety Drawing — Emergency Exit Dimensions', priority: 'HIGH' } },
  ];

  for (const entry of entries) {
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        actor_id: entry.actor_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        before_data: (entry as { before_data?: Record<string, unknown> }).before_data as never ?? undefined,
        after_data: entry.after_data as never,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱 Seeding database...\n');

  console.log('  → Organizations & departments');
  const { org } = await seedOrgsAndDepts();

  console.log('  → Demo users');
  await seedUsers(org.id);

  console.log('  → Project + attributes');
  const project = await seedProject(org.id);

  console.log('  → Approval types');
  await seedApprovalTypes();

  console.log('  → Applicability rules');
  await seedApplicabilityRules();

  console.log('  → Document requirements');
  await seedDocumentRequirements();

  console.log('  → Approval dependencies');
  await seedDependencies();

  console.log('  → SLA policies');
  await seedSLAPolicies();

  console.log('  → Project approvals');
  await seedProjectApprovals(project.id);

  console.log('  → Documents');
  await seedDocuments(org.id, project.id);

  console.log('  → Applications');
  await seedApplications();

  console.log('  → Application documents');
  await seedApplicationDocuments();

  console.log('  → Application events');
  await seedApplicationEvents();

  console.log('  → Queries + responses');
  await seedQueries();

  console.log('  → Inspections + findings');
  await seedInspections();

  console.log('  → SLA instances');
  await seedSLAInstances();

  console.log('  → Incentive schemes + matches');
  await seedIncentives(project.id);

  console.log('  → Compliance requirements');
  await seedCompliance(project.id);

  console.log('  → Notifications');
  await seedNotifications();

  console.log('  → Audit log');
  await seedAuditLog();

  console.log('\n✅ Seed complete!');
  console.log('   Demo accounts (password: Demo@123):');
  console.log('   • entrepreneur@demo.local  (ENTREPRENEUR)');
  console.log('   • manager@demo.local       (MANAGER)');
  console.log('   • officer@demo.local       (OFFICER / MIDC)');
  console.log('   • nodal@demo.local         (NODAL)');
  console.log('   • inspector@demo.local     (INSPECTOR)');
  console.log('   • admin@demo.local         (ADMIN)');
  console.log('   • pcb.officer@demo.local   (OFFICER / PCB)');
  console.log('\n   Demo project: ABC Foods Pvt Ltd — New Food Processing Unit');
  console.log(`   Project ID: ${project.id}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
