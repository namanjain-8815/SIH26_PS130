import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P0.8 — Prescribed Application Forms & Templates Grounding Integration Tests', () => {
  let token: string;
  let baseUrl: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/prescribed-forms lists all configured statutory forms and templates with provenance', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const forms = (await res.json()) as any[];
    assert.ok(Array.isArray(forms));
    assert.ok(forms.length >= 5);

    // MPCB Consent Form
    const mpcbForm = forms.find((f) => f.id === 'form-mpcb-cte-red');
    assert.ok(mpcbForm, 'MPCB form must exist');
    assert.strictEqual(mpcbForm.category, 'Statutory Prescribed Format');
    assert.strictEqual(mpcbForm.provenance_status, 'VERIFIED_OFFICIAL_DOCUMENT');
    assert.ok(mpcbForm.source_label.includes('MPCB'));
    assert.ok(mpcbForm.source_url.startsWith('https://www.mpcb.gov.in'));

    // Maharashtra Labour Department Form 2
    const dishForm = forms.find((f) => f.id === 'form-dish-factory-licence');
    assert.ok(dishForm, 'Labour Dept / DISH form must exist');
    assert.strictEqual(dishForm.category, 'Statutory Prescribed Format');
    assert.strictEqual(dishForm.provenance_status, 'VERIFIED_OFFICIAL_DOCUMENT');
    assert.ok(dishForm.form_name.includes('Form 2'));
    assert.ok(dishForm.source_url.includes('mahakamgar.maharashtra.gov.in'));

    // FSSAI Form B with online FoSCoS portal
    const fssaiForm = forms.find((f) => f.id === 'form-fssai-food-licence');
    assert.ok(fssaiForm, 'FSSAI form must exist');
    assert.strictEqual(fssaiForm.category, 'Statutory Prescribed Format');
    assert.strictEqual(fssaiForm.provenance_status, 'VERIFIED_OFFICIAL_DOCUMENT');
    assert.strictEqual(fssaiForm.is_online_application, true);
    assert.ok(fssaiForm.official_online_url.includes('foscos.fssai.gov.in'));

    // MIDC Water Connection online application
    const midcWater = forms.find((f) => f.id === 'form-midc-water-allotment');
    assert.ok(midcWater, 'MIDC Water form must exist');
    assert.strictEqual(midcWater.category, 'Demonstration / Configurable Form');
    assert.strictEqual(midcWater.is_online_application, true);
    assert.ok(midcWater.official_online_url.includes('services.midcindia.org'));
  });

  it('2. GET /api/prescribed-forms/:id returns detailed metadata for a specific template', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms/form-dish-factory-licence`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const form = (await res.json()) as any;
    assert.strictEqual(form.id, 'form-dish-factory-licence');
    assert.strictEqual(form.document_type, 'Factory Layout Plan');
    assert.ok(form.source_label.includes('Labour Department') || form.source_label.includes('DISH'));
    assert.strictEqual(form.category, 'Statutory Prescribed Format');
    assert.strictEqual(form.provenance_status, 'VERIFIED_OFFICIAL_DOCUMENT');
    assert.ok(form.file_name.endsWith('.pdf'));
  });

  it('3. GET /api/prescribed-forms/:id/download downloads verified statutory PDF with attachment header', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms/form-mpcb-cte-red/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition);
    assert.ok(disposition.includes('attachment'));
    assert.ok(disposition.includes('.pdf'));

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 100);
    const header = Buffer.from(buffer.slice(0, 5)).toString();
    assert.ok(header.startsWith('%PDF-'));
  });

  it('4. GET /api/approval-types returns approval types enriched with prescribed_form', async () => {
    const res = await fetch(`${baseUrl}/api/approval-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const types = (await res.json()) as any[];
    assert.ok(Array.isArray(types));
    const cteType = types.find((t) => t.name.includes('Consent to Establish') || t.name.includes('CTE'));
    assert.ok(cteType);
    assert.ok(cteType.prescribed_form);
    assert.ok(cteType.prescribed_form.form_name.includes('Consent'));
  });

  it('5. GET /api/prescribed-forms/form-fssai-food-licence/download downloads verified FSSAI PDF', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms/form-fssai-food-licence/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 100000, 'Verified official FSSAI compendium PDF should be substantial in size');
    const header = Buffer.from(buffer.slice(0, 5)).toString();
    assert.ok(header.startsWith('%PDF-'));
  });
});
