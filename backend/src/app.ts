import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { router as apiRouter } from './routes';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRouter);

// Keep the error handler mounted last.
app.use(errorHandler);
