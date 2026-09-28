import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getDigiLockerSimulationStatus,
  executeDigiLockerSimulation,
  resetDigiLockerSimulation,
} from '../services/digiLockerSimulationService';

const router = Router();

/**
 * P1.X — DigiLocker Verification — Prototype Simulation Routes
 * 
 * Explicitly simulated consent-based verification using demonstration data.
 * Zero external API keys or live third-party calls.
 */

// GET /api/projects/:id/digilocker/status
router.get('/projects/:id/digilocker/status', requireAuth, async (req, res, next) => {
  try {
    const result = await getDigiLockerSimulationStatus(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/digilocker/simulate
router.post('/projects/:id/digilocker/simulate', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id || 'usr-ent-001';
    const result = await executeDigiLockerSimulation(req.params.id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/digilocker/reset
router.post('/projects/:id/digilocker/reset', requireAuth, async (req, res, next) => {
  try {
    const result = await resetDigiLockerSimulation(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
