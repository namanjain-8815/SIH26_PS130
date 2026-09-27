import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('P1.8 — Prescribed Form / Template Download Integration Tests', () => {
  let token: string;
  let baseUrl: string;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/prescribed-forms lists all configured statutory forms and templates', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const forms = (await res.json()) as any[];
    assert.ok(Array.isArray(forms));
    assert.ok(forms.length >= 4);

    const cteForm = forms.find((f) => f.id === 'form-mpcb-cte-red');
    assert.ok(cteForm);
    assert.strictEqual(cteForm.category, 'Statutory Prescribed Format');
    assert.ok(cteForm.source_label.includes('MPCB'));
    assert.ok(cteForm.form_name.includes('Form-I'));
  });

  it('2. GET /api/prescribed-forms/:id returns detailed metadata for a specific template', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms/form-dish-factory-licence`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const form = (await res.json()) as any;
    assert.strictEqual(form.id, 'form-dish-factory-licence');
    assert.strictEqual(form.document_type, 'Factory Layout Plan');
    assert.ok(form.source_label.includes('DISH'));
    assert.strictEqual(form.category, 'Statutory Prescribed Format');
    assert.ok(form.file_name.endsWith('.pdf'));
  });

  it('3. GET /api/prescribed-forms/:id/download downloads statutory template with attachment header', async () => {
    const res = await fetch(`${baseUrl}/api/prescribed-forms/form-mpcb-cte-red/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition);
    assert.ok(disposition.includes('attachment'));
    assert.ok(disposition.includes('MPCB_Form_I_Consent_to_Establish_Template.pdf'));

    const text = await res.text();
    assert.ok(text.startsWith('%PDF-'));
    assert.ok(text.includes('FORM-I: APPLICATION FOR CONSENT TO ESTABLISH'));
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
    assert.ok(cteType.prescribed_form.form_name.includes('Form-I'));
  });
});
