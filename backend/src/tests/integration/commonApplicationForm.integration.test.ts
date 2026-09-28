import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P0.4 — Common Application Form / Pre-Populated Application Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const POLLUTION_APP_ID = 'app-pollution';

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/applications/:id/form returns pre-populated common data with verified source labels', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${POLLUTION_APP_ID}/form`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const form = (await res.json()) as any;

    assert.strictEqual(form.application_id, POLLUTION_APP_ID);
    assert.ok(form.application_number);
    assert.ok(form.department);
    assert.ok(form.approval_type);

    // 1. Common Applicant Data (Master Profile Entity)
    assert.ok(Array.isArray(form.common_applicant_data), 'common_applicant_data must be array');
    const legalNameField = form.common_applicant_data.find((f: any) => f.key === 'legal_name');
    assert.ok(legalNameField, 'Legal name must be present');
    assert.strictEqual(legalNameField.value, 'ABC Foods Pvt Ltd');
    assert.strictEqual(legalNameField.source_label, 'From Verified Project Profile');
    assert.strictEqual(legalNameField.verified, true);

    const panField = form.common_applicant_data.find((f: any) => f.key === 'pan');
    assert.ok(panField, 'PAN must be present');
    assert.strictEqual(panField.source_label, 'From Verified Project Profile');

    // 2. Common Project Data
    assert.ok(Array.isArray(form.common_project_data), 'common_project_data must be array');
    const sectorField = form.common_project_data.find((f: any) => f.key === 'sector');
    assert.ok(sectorField, 'Sector must be present');
    assert.strictEqual(sectorField.value, 'Food Processing');
    assert.strictEqual(sectorField.source_label, 'From Verified Project Profile');

    // 3. Location Data
    assert.ok(Array.isArray(form.location_data), 'location_data must be array');
    const districtField = form.location_data.find((f: any) => f.key === 'district');
    assert.ok(districtField, 'District must be present');
    assert.strictEqual(districtField.value, 'Pune');
    assert.strictEqual(districtField.source_label, 'From Verified Project Profile');

    // 4. Department-Specific Fields
    assert.ok(Array.isArray(form.department_specific_fields), 'department_specific_fields must be array');
    assert.ok(form.department_specific_fields.length > 0, 'Must have department-specific fields');

    // For pollution / MPCB: water_consumption_kld, effluent_generation_kld, boiler_fuel_type, etc.
    const waterField = form.department_specific_fields.find((f: any) => f.field_key === 'water_consumption_kld');
    assert.ok(waterField, 'MPCB form must have water_consumption_kld');
    assert.ok(waterField.label);
    assert.strictEqual(waterField.unit, 'KLD');

    // 5. Attachments Summary & Prescribed Template
    assert.ok(form.attachments_summary);
    assert.ok(Array.isArray(form.attachments_summary.items));
    assert.ok(form.prescribed_form, 'Prescribed Form I should be present for Consent to Establish');
    assert.strictEqual(form.prescribed_form.id, 'form-mpcb-cte-red');
  });

  it('2. PATCH /api/applications/:id/form saves department-specific fields without mutating shared master profile', async () => {
    const FACTORY_APP_ID = 'app-factory';
    const updatedValues = {
      installed_power_hp: 850,
      factory_builtup_area_sqm: 6200,
      max_shift_workers: 45,
      hazardous_process_declared: 'No - General Non-Hazardous Manufacturing',
      manufacturing_process_summary: 'Automated cryogenic food handling and sterile packaging.',
    };

    const res = await fetch(`${baseUrl}/api/applications/${FACTORY_APP_ID}/form`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        department_values: updatedValues,
        notes: 'Updated power and layout specifications for factory license.',
      }),
    });

    assert.strictEqual(res.status, 200);
    const updatedForm = (await res.json()) as any;

    const savedPower = updatedForm.department_specific_fields.find((f: any) => f.field_key === 'installed_power_hp');
    assert.strictEqual(Number(savedPower.value), 850);

    const savedArea = updatedForm.department_specific_fields.find((f: any) => f.field_key === 'factory_builtup_area_sqm');
    assert.strictEqual(Number(savedArea.value), 6200);

    // Verify shared master profile is still intact
    const masterRes = await fetch(`${baseUrl}/api/projects/proj-abc-foods-001/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const master = (await masterRes.json()) as any;
    assert.strictEqual(master.entity.legal_name, 'ABC Foods Pvt Ltd');
    assert.strictEqual(master.proposal.sector, 'Food Processing');
  });

  it('3. Form submission validation guards against missing mandatory requirements', async () => {
    // Attempting to submit when mandatory documents or fields are incomplete
    const res = await fetch(`${baseUrl}/api/applications/app-factory/form/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        notes: 'Attempting submission without prerequisites or documents',
      }),
    });

    // Should reject or return bad request / prerequisite / document error
    assert.ok(res.status === 400 || res.status === 403 || res.status === 404);
  });
});
