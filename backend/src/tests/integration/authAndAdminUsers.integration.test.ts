import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getTestBaseUrl, closeTestServer, loginAs } from './testHelper';
import { prisma } from '../../lib/prisma';

describe('B0.6 - B0.9 — Auth, Registration, Representative & Admin Officer Tests', () => {
  let baseUrl: string;
  let adminToken: string;
  let entrepreneurToken: string;
  let createdOfficerId: string;
  let registeredUserId: string;
  let registeredOrgId: string;

  const testEmail = `applicant.test.${Date.now()}@example.com`;
  const officerEmail = `midc.officer.test.${Date.now()}@example.com`;

  before(async () => {
    baseUrl = await getTestBaseUrl();
    adminToken = await loginAs('admin@demo.local');
    entrepreneurToken = await loginAs('entrepreneur@demo.local');
  });

  after(async () => {
    if (createdOfficerId) {
      await prisma.user.delete({ where: { id: createdOfficerId } }).catch(() => {});
    }
    if (registeredUserId) {
      await prisma.user.delete({ where: { id: registeredUserId } }).catch(() => {});
    }
    if (registeredOrgId) {
      await prisma.organization.delete({ where: { id: registeredOrgId } }).catch(() => {});
    }
    await closeTestServer();
  });

  it('1. POST /api/auth/register creates new organization and applicant account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pradeep Sharma',
        email: testEmail,
        password: 'Password@123',
        entity_name: 'Sharma Agro Industries Pvt Ltd',
        entity_type: 'Private Limited Company',
        sector: 'Agro Processing',
        contact_number: '+91 9876543210',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.token, 'Token should be returned');
    assert.ok(body.user.id, 'User ID should be returned');
    assert.strictEqual(body.user.role, 'ENTREPRENEUR');
    assert.strictEqual(body.user.name, 'Pradeep Sharma');
    assert.ok(body.user.organization, 'Organization should be returned');
    assert.strictEqual(body.user.organization.legal_name, 'Sharma Agro Industries Pvt Ltd');

    registeredUserId = body.user.id;
    registeredOrgId = body.user.organization.id;
  });

  it('2. POST /api/auth/register blocks duplicate email registration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Sharma',
        email: testEmail,
        password: 'Password@123',
        entity_name: 'Duplicate Agro Pvt Ltd',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = (await res.json()) as any;
    assert.ok(body.error?.includes('already exists'));
  });

  it('3. POST /api/auth/login allows newly registered user to log in', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.token);
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.user.organization.legal_name, 'Sharma Agro Industries Pvt Ltd');
  });

  it('4. POST /api/auth/login for Authorized Representative includes represented entity', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@demo.local',
        password: 'Demo@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.user.role, 'MANAGER');
    assert.ok(body.user.organization, 'Organization context should be attached to representative');
    assert.strictEqual(body.user.organization.legal_name, 'ABC Foods Pvt Ltd');
  });

  it('5. POST /api/admin/users blocks non-admin callers from creating officer accounts', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${entrepreneurToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Officer',
        email: 'unauth@demo.local',
        password: 'Demo@123',
        role: 'OFFICER',
        department_id: 'dept-midc',
      }),
    });

    assert.strictEqual(res.status, 403);
  });

  it('6. POST /api/admin/users requires department for department-bound officers', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Officer No Dept',
        email: 'nodept@demo.local',
        password: 'Demo@123',
        role: 'OFFICER',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = (await res.json()) as any;
    assert.ok(body.error?.includes('Department is mandatory'));
  });

  it('7. POST /api/admin/users allows admin to create Competent Authority Officer with department', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Suresh Patil',
        email: officerEmail,
        password: 'Officer@123',
        role: 'OFFICER',
        department_id: 'dept-midc',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.id);
    assert.strictEqual(body.name, 'Suresh Patil');
    assert.strictEqual(body.role, 'OFFICER');
    assert.strictEqual(body.department_id, 'dept-midc');
    createdOfficerId = body.id;
  });

  it('8. Newly created officer can log in with department context', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: officerEmail,
        password: 'Officer@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.token);
    assert.strictEqual(body.user.role, 'OFFICER');
    assert.strictEqual(body.user.department_id, 'dept-midc');
    assert.strictEqual(body.user.department.name, 'Maharashtra Industrial Development Corporation (MIDC)');
  });
});
