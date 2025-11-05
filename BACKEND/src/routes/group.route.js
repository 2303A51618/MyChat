import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { createGroup, addMember, removeMember, pinMessage, getMyGroups, getGroupById, getGroupMembers, promoteMember, updateGroup, demoteMember, deleteGroup, createInvite, joinWithInvite } from '../controllers/group.controller.js';

const router = express.Router();

router.post('/', protectRoute, createGroup);
router.get('/', protectRoute, getMyGroups);
router.get('/:groupId', protectRoute, getGroupById);
router.get('/:groupId/members', protectRoute, getGroupMembers);
router.post('/:groupId/members', protectRoute, addMember);
// remove member (used for exit and admin remove)
router.delete('/:groupId/members/:userId', protectRoute, removeMember);
router.post('/:groupId/members/:userId/promote', protectRoute, promoteMember);
router.post('/:groupId/members/:userId/demote', protectRoute, demoteMember);
router.delete('/:groupId', protectRoute, deleteGroup);
// invites
router.post('/:groupId/invites', protectRoute, createInvite);
router.post('/invites/:token/join', protectRoute, joinWithInvite);
router.patch('/:groupId', protectRoute, updateGroup);
router.post('/:groupId/pin', protectRoute, pinMessage);

export default router;
