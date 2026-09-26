import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as notificationService from '../services/notificationService';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await notificationService.listUserNotifications(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await notificationService.markNotificationRead(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
