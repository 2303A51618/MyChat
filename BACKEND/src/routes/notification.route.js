import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { registerDeviceToken, sendGroupAnnouncement } from '../controllers/notification.controller.js';

const router = express.Router();

router.post('/device', protectRoute, registerDeviceToken);
router.post('/groups/:groupId/announce', protectRoute, sendGroupAnnouncement);

export default router;
