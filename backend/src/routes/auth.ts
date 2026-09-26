import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as authService from '../services/authService';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    res.json(await authService.login(email, password));
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(await authService.getCurrentUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

export default router;
