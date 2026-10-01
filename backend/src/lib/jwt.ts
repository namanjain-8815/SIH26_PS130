import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET || 'sih26-ps130-industrial-approvals-platform-jwt-secret-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

export interface TokenPayload {
  sub: string;
  role: string;
  department_id?: string | null;
  org_id?: string | null;
}

export function signToken(payload: TokenPayload): string {
  // Cast expiresIn to any to avoid jsonwebtoken v9 overload ambiguity with string values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
