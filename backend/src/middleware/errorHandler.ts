import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  const status =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
      ? err.statusCode
      : 500;

  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : 'Internal server error';

  console.error('API Error:', err);
  return res.status(status).json({ error: message || 'Internal server error' });
}
