import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../lib/errors';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    org_id: string | null;
    department_id: string | null;
    department?: { id: string; name: string; state?: string; district?: string } | null;
    organization?: { id: string; name: string; legal_name?: string } | null;
  };
}

export interface RegisterApplicantInput {
  name: string;
  email: string;
  password: string;
  entity_name: string;
  entity_type?: string;
  sector?: string;
  contact_number?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    throw new BadRequestError('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { department: true, organization: true },
  });
  if (!user) throw new UnauthorizedError('Invalid credentials');
  if (!user.password_hash) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = signToken({
    sub: user.id,
    role: user.role,
    department_id: user.department_id ?? null,
    org_id: user.org_id ?? null,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
      department_id: user.department_id,
      department: user.department
        ? {
            id: user.department.id,
            name: user.department.name,
            state: user.department.state,
            district: user.department.district,
          }
        : null,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: (user.organization as any).legal_name || (user.organization as any).name || '',
            legal_name: (user.organization as any).legal_name || (user.organization as any).name || '',
          }
        : null,
    },
  };
}

export async function registerApplicant(input: RegisterApplicantInput): Promise<LoginResult> {
  if (!input.name || !input.email || !input.password || !input.entity_name) {
    throw new BadRequestError('Name, email, password, and legal entity name are required.');
  }

  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new BadRequestError('An account with this email address already exists.');
  }

  const password_hash = await bcrypt.hash(input.password, 10);

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      legal_name: input.entity_name.trim(),
      entity_type: input.entity_type || 'Private Limited Company',
      sector: input.sector || 'Manufacturing / Industrial',
    },
  });

  // 2. Create User as Applicant / Entrepreneur
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      password_hash,
      role: 'ENTREPRENEUR',
      org_id: org.id,
    },
  });

  const token = signToken({
    sub: user.id,
    role: user.role,
    department_id: null,
    org_id: org.id,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      org_id: org.id,
      department_id: null,
      department: null,
      organization: {
        id: org.id,
        name: (org as any).legal_name || (org as any).name || input.entity_name.trim(),
        legal_name: (org as any).legal_name || (org as any).name || input.entity_name.trim(),
      },
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true, organization: true },
  });
  if (!user) throw new NotFoundError('User not found');
  const { password_hash: _password_hash, ...safeUser } = user;
  return {
    ...safeUser,
    department: user.department
      ? {
          id: user.department.id,
          name: user.department.name,
          state: user.department.state,
          district: user.department.district,
        }
      : null,
    organization: user.organization
      ? {
          id: user.organization.id,
          name: (user.organization as any).legal_name || (user.organization as any).name || '',
          legal_name: (user.organization as any).legal_name || (user.organization as any).name || '',
        }
      : null,
  };
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current password and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new BadRequestError('New password must be at least 8 characters in length.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    throw new BadRequestError('Current password does not match.');
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: newHash },
  });

  return { success: true, message: 'Password updated successfully.' };
}
