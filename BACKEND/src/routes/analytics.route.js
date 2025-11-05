import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { recordEvent, getSummary } from '../controllers/analytics.controller.js';

const router = express.Router();

router.post('/event', protectRoute, recordEvent);
router.get('/summary', protectRoute, getSummary);

export default router;
