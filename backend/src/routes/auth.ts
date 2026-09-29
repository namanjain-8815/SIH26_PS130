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

router.post('/register', async (req, res, next) => {
  try {
    res.status(201).json(await authService.registerApplicant(req.body));
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

router.post('/update-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body as {
      current_password: string;
      new_password: string;
    };
    res.json(await authService.updatePassword(req.user!.id, current_password, new_password));
  } catch (err) {
    next(err);
  }
});

export default router;
