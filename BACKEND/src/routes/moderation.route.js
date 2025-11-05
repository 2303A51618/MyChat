import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { createReport, listReports, takeAction } from '../controllers/moderation.controller.js';

const router = express.Router();

router.post('/reports', protectRoute, createReport);
router.get('/reports', protectRoute, listReports);
router.post('/reports/:reportId/action', protectRoute, takeAction);

export default router;
