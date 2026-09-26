import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { UnauthorizedError, NotFoundError } from '../lib/errors';

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
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { department: true },
  });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = signToken({ sub: user.id, role: user.role, department_id: user.department_id ?? null });

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
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true },
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
  };
}
