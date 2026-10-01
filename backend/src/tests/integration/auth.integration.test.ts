import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';

describe('Auth Integration Tests', () => {
  after(async () => {
    await closeTestServer();
  });

  it('authenticates officer with valid credentials', async () => {
    const baseUrl = await getTestBaseUrl();
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@demo.local', password: 'Demo@123' }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.token, 'Token should be returned');
    assert.strictEqual(data.user.role, 'OFFICER');
    assert.strictEqual(data.user.email, 'officer@demo.local');
  });

  it('authenticates entrepreneur with valid credentials', async () => {
    const baseUrl = await getTestBaseUrl();
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'entrepreneur@demo.local', password: 'Demo@123' }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'ENTREPRENEUR');
  });

  it('rejects login with invalid password', async () => {
    const baseUrl = await getTestBaseUrl();
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@demo.local', password: 'WrongPassword' }),
    });

    assert.strictEqual(res.status, 401);
  });

  it('returns current profile via GET /api/auth/me when authenticated', async () => {
    const token = await loginAs('officer@demo.local');
    const baseUrl = await getTestBaseUrl();

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.strictEqual(res.status, 200);
    const profile = (await res.json()) as any;
    assert.strictEqual(profile.email, 'officer@demo.local');
    assert.strictEqual(profile.role, 'OFFICER');
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const baseUrl = await getTestBaseUrl();
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(res.status, 401);
  });
});
