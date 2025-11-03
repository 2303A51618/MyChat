import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { createGroup, addMember, removeMember, pinMessage, getMyGroups } from '../controllers/group.controller.js';

const router = express.Router();

router.post('/', protectRoute, createGroup);
router.get('/', protectRoute, getMyGroups);
router.post('/:groupId/members', protectRoute, addMember);
// Removing unused group routes (pin and remove member) — keep controllers for now
// router.delete('/:groupId/members/:userId', protectRoute, removeMember);
// router.post('/:groupId/pin', protectRoute, pinMessage);

export default router;
