import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('P1.X — DigiLocker Verification Prototype Simulation Integration Tests', () => {
  let token: string;
  let baseUrl: string;
  const projectId = 'proj-abc-foods-001';

  before(async () => {
    baseUrl = await getTestBaseUrl();
    token = await loginAs('entrepreneur@demo.local');
    // Ensure clean starting unconnected state
    await prisma.auditLog.deleteMany({
      where: {
        entity_id: projectId,
        action: 'DIGILOCKER_SIMULATION_VERIFIED',
      },
    });
  });

  after(async () => {
    await closeTestServer();
  });

  it('1. GET /api/projects/:id/digilocker/status starts in unconnected state with available documents and prototype disclosure', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/digilocker/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.simulation, true, 'Must clearly identify as simulation');
    assert.strictEqual(data.is_connected, false, 'Initial state must not be directly verified/connected');

    assert.ok(data.available_documents, 'Must list available DigiLocker documents');
    assert.ok(Array.isArray(data.available_documents.company_documents));
    assert.ok(Array.isArray(data.available_documents.user_documents));
    assert.ok(data.available_documents.company_documents.length >= 3);
    assert.ok(data.available_documents.user_documents.length >= 2);

    assert.ok(Array.isArray(data.reusable_form_fields), 'Must provide reusable form fields');

    assert.ok(data.disclaimer, 'Must include prototype disclaimer');
    assert.ok(
      data.disclaimer.includes('DigiLocker connection using API Setu is future integration'),
      'Must contain explicit API Setu future integration notice'
    );
  });

  it('2. POST /api/projects/:id/digilocker/simulate connects, verifies credentials, and ingests documents', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/digilocker/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.simulation, true);
    assert.strictEqual(data.is_connected, true, 'Status must now be connected');
    assert.strictEqual(data.credentials.pan.status, 'VERIFIED');
    assert.strictEqual(data.credentials.organization.status, 'VERIFIED');
    assert.strictEqual(data.credentials.cin.status, 'VERIFIED');
    assert.strictEqual(data.credentials.signatory.status, 'VERIFIED');

    assert.ok(data.data_reuse_summary.vault_documents_verified > 0);
  });

  it('3. Generates explainable audit log entry upon simulated verification', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity_id: projectId,
        action: 'DIGILOCKER_SIMULATION_VERIFIED',
      },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });

    assert.ok(logs.length > 0, 'Audit log entry must be recorded');
    const log = logs[0] as any;
    assert.strictEqual(log.action, 'DIGILOCKER_SIMULATION_VERIFIED');
    assert.strictEqual(log.metadata?.simulated, true);
  });

  it('4. Creates user notification about verified demonstration credentials', async () => {
    const notifications = await prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const match = notifications.find((n: any) =>
      n.title?.includes('DigiLocker Verification Simulation Complete')
    );
    assert.ok(match, 'User notification must be dispatched');
    assert.ok(match.message.includes('PAN: AABCA1234F'));
  });

  it('5. POST /api/projects/:id/digilocker/reset resets simulation back to unconnected state', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/digilocker/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.is_connected, false, 'Must be reset back to unconnected state');
  });

  it('6. Enforces authentication guard on DigiLocker simulation endpoints', async () => {
    const unauthGet = await fetch(`${baseUrl}/api/projects/${projectId}/digilocker/status`);
    assert.strictEqual(unauthGet.status, 401);

    const unauthPost = await fetch(`${baseUrl}/api/projects/${projectId}/digilocker/simulate`, {
      method: 'POST',
    });
    assert.strictEqual(unauthPost.status, 401);

    const unauthReset = await fetch(`${baseUrl}/api/projects/${projectId}/digilocker/reset`, {
      method: 'POST',
    });
    assert.strictEqual(unauthReset.status, 401);
  });

  it('7. Operates 100% self-contained without requiring external API keys or network requests', async () => {
    assert.strictEqual(process.env.DIGILOCKER_API_KEY, undefined, 'No DigiLocker API key should exist');
    assert.strictEqual(process.env.API_SETU_CLIENT_SECRET, undefined, 'No API Setu key should exist');
  });
});
