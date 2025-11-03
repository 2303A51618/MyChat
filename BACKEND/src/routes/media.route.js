import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { uploadMedia } from '../controllers/media.controller.js';

const router = express.Router();

router.post('/upload', protectRoute, uploadMedia);

export default router;
