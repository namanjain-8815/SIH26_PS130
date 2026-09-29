import { Router, RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { prisma } from '../lib/prisma';
import * as auditService from '../services/auditService';
import bcrypt from 'bcrypt';


const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

// Generic CRUD wrapper for the regulatory catalog tables (plan §27) — every
// admin screen (approval-types, rules, dependencies, sla-policies,
// incentive-schemes) is the same read/create/update/delete shape over a
// different Prisma model, so this stays data-driven the way the rest of the
// engine does rather than five near-duplicate route files. Every mutation
// is audit-logged (plan §39).
interface CrudModel {
  findMany: (...args: unknown[]) => Promise<unknown>;
  findUnique?: (...args: unknown[]) => Promise<unknown>;
  create: (...args: unknown[]) => Promise<{ id: string }>;
  update: (...args: unknown[]) => Promise<unknown>;
  delete: (...args: unknown[]) => Promise<unknown>;
}

function mountCrud(path: string, model: CrudModel, defaultInclude?: Record<string, boolean>) {
  router.get(`/${path}`, (async (_req, res, next) => {
    try {
      res.json(await model.findMany(defaultInclude ? { include: defaultInclude } : undefined));
    } catch (err) {
      next(err);
    }
  }) as RequestHandler);

  router.post(`/${path}`, (async (req, res, next) => {
    try {
      const data = { ...req.body };
      if (path === 'approval-types') {
        if (!data.purpose) data.purpose = data.description || data.name;
        if (!data.description) data.description = data.purpose || data.name;
        if (data.active === undefined) data.active = true;
      }
      const created = await model.create({ data });
      await auditService.recordAudit({
        actor_id: req.user!.id,
        action: 'create',
        entity_type: path,
        entity_id: created.id,
        after_data: data,
      });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler);

  router.patch(`/${path}/:id`, (async (req, res, next) => {
    try {
      const before = model.findUnique ? await model.findUnique({ where: { id: req.params.id } }) : undefined;
      const updated = await model.update({ where: { id: req.params.id }, data: req.body });
      await auditService.recordAudit({
        actor_id: req.user!.id,
        action: 'update',
        entity_type: path,
        entity_id: req.params.id,
        before_data: before,
        after_data: req.body,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler);

  router.delete(`/${path}/:id`, (async (req, res, next) => {
    try {
      const before = model.findUnique ? await model.findUnique({ where: { id: req.params.id } }) : undefined;
      await model.delete({ where: { id: req.params.id } });
      await auditService.recordAudit({
        actor_id: req.user!.id,
        action: 'delete',
        entity_type: path,
        entity_id: req.params.id,
        before_data: before,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }) as RequestHandler);
}

mountCrud('approval-types', prisma.approvalType as unknown as CrudModel);
mountCrud('rules', prisma.applicabilityRule as unknown as CrudModel, { approval_type: true });
mountCrud('dependencies', prisma.approvalDependency as unknown as CrudModel, {
  prerequisite_approval_type: true,
  dependent_approval_type: true,
});
mountCrud('sla-policies', prisma.sLAPolicy as unknown as CrudModel, { approval_type: true });
mountCrud('incentive-schemes', prisma.incentiveScheme as unknown as CrudModel);

router.get('/audit-log', async (req, res, next) => {
  try {
    res.json(
      await auditService.listAuditLog({
        entity_type: req.query.entity_type as string | undefined,
        entity_id: req.query.entity_id as string | undefined,
        actor_id: req.query.actor_id as string | undefined,
        action: req.query.action as string | undefined,
        take: req.query.take ? Number(req.query.take) : undefined,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/departments', async (_req, res, next) => {
  try {
    res.json(await prisma.department.findMany());
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { department: true, organization: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(users.map(({ password_hash: _pw, ...u }) => u));
  } catch (err) {
    next(err);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role, department_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }
    if (['OFFICER', 'INSPECTOR'].includes(role) && !department_id) {
      return res.status(400).json({ error: 'Department is mandatory for department-bound officers.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        role,
        department_id: department_id || null,
      },
      include: { department: true },
    });
    await auditService.recordAudit({
      actor_id: req.user!.id,
      action: 'CREATE_OFFICER_ACCOUNT',
      entity_type: 'User',
      entity_id: user.id,
      after_data: { name, email: normalizedEmail, role, department_id },
    });
    const { password_hash: _pw, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    next(err);
  }
});

export default router;

