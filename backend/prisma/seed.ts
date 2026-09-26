import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@123';

async function seedDemoUsers(orgId: string, deptId: string) {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const accounts: Array<{
    name: string;
    email: string;
    role: Role;
    org_id?: string;
    department_id?: string;
  }> = [
    { name: 'Demo Entrepreneur', email: 'entrepreneur@demo.local', role: 'ENTREPRENEUR', org_id: orgId },
    { name: 'Demo Compliance Manager', email: 'manager@demo.local', role: 'MANAGER', org_id: orgId },
    { name: 'Demo Government Officer', email: 'officer@demo.local', role: 'OFFICER', department_id: deptId },
    { name: 'Demo Nodal Officer', email: 'nodal@demo.local', role: 'NODAL', department_id: deptId },
    { name: 'Demo Inspector', email: 'inspector@demo.local', role: 'INSPECTOR', department_id: deptId },
    { name: 'Demo Admin', email: 'admin@demo.local', role: 'ADMIN' },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: { ...account, password_hash },
    });
  }
}

async function seedCoreOrgAndDepartment() {
  const org = await prisma.organization.upsert({
    where: { id: 'org-abc-foods' },
    update: {},
    create: {
      id: 'org-abc-foods',
      legal_name: 'ABC Foods Pvt Ltd',
      entity_type: 'Private Limited Company',
      sector: 'Food Processing',
    },
  });

  const dept = await prisma.department.upsert({
    where: { id: 'dept-midc' },
    update: {},
    create: {
      id: 'dept-midc',
      name: 'Maharashtra Industrial Development Corporation',
      state: 'Maharashtra',
      district: 'Pune',
    },
  });

  // -------------------------------------------------------------------
  // TODO (plan §42-43) — this is the actual hackathon seed data, build it
  // here as further upserts, in this order (respects foreign keys):
  //
  // 1. Project "ABC Foods Pvt Ltd — New Food Processing Unit" (org.id,
  //    Pune, MIDC, sector Food Processing, investment 25_00_00_000,
  //    80 employees, stage pre_establishment) + ProjectAttribute rows for
  //    the operational characteristics in plan §12 step 4 (water usage,
  //    power requirement, pollution category, etc).
  // 2. 8-12 ApprovalType rows spanning the departments a food-processing
  //    unit in Maharashtra would realistically touch (pollution consent,
  //    fire NOC, factory licence, electricity connection, labour
  //    registration, FSSAI, etc) — mark source_reference as
  //    "Demonstration / configurable regulatory data" unless pulled from
  //    an authoritative source (AGENT_INITIAL_PROMPT.md allows data.gov.in
  //    as a reference, still labeled as demo data).
  // 3. ApplicabilityRule rows per ApprovalType, conditions shaped as
  //    RuleCondition[] (see rule-engine/types.ts) matching this project's
  //    profile so runRegulatoryAnalysis() actually resolves something.
  // 4. DocumentRequirement rows per ApprovalType.
  // 5. ApprovalDependency rows (e.g. Factory Approval depends on Pollution
  //    Consent; Inspection depends on Factory Approval).
  // 6. SLAPolicy rows per ApprovalType.
  // 7. Run/replicate the regulatory-analysis flow to create ProjectApproval
  //    rows, then Application rows for a mix of statuses (some completed,
  //    some in progress, one BLOCKED) per the demo storyline in plan §43.
  // 8. One open Query with a response, one at-risk SLAInstance, one
  //    scheduled Inspection, one upcoming ComplianceRequirement (renewal).
  // 9. 4 IncentiveScheme rows with eligibility_rules matching this
  //    project's profile, so incentive discovery has something to show.
  //
  // Keep every insert an upsert (idempotent) so this script is always safe
  // to re-run (DEVELOPER_GUIDE.md §7).
  // -------------------------------------------------------------------

  return { org, dept };
}

async function main() {
  const { org, dept } = await seedCoreOrgAndDepartment();
  await seedDemoUsers(org.id, dept.id);
  console.log('Seed complete — demo accounts ready, ABC Foods project/approval catalog still TODO (see comments above).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
