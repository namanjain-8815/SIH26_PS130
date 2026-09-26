import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        department_id?: string | null;
      };
    }
  }
}
