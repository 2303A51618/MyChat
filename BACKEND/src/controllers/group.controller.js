import Group from '../models/group.model.js';
import Message from '../models/message.model.js';
import { io } from '../lib/socket.js';
import GroupInvite from '../models/groupInvite.model.js';

const MAX_GROUP_SIZE = 512;
const MAX_ADMINS = 5;
import { logEvent } from '../lib/audit.js';

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds = [], avatar } = req.body;
    const adminId = req.user._id;
    const group = await Group.create({ name, avatar, members: [adminId, ...memberIds], admins: [adminId] });
    // notify members (simple broadcast)
    group.members.forEach(m => io.to(`user:${m}`).emit('group:created', group));
  logEvent('group.created', req.user._id, group._id, { name: group.name });
    res.status(201).json(group);
  } catch (err) {
    console.error('createGroup error', err.message);
    res.status(500).json({ message: 'Failed to create group' });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate('members', '_id username fullName profilePhoto');
    res.json(groups);
  } catch (err) {
    console.error('getMyGroups error', err.message);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // only admins can add members
    const requesterId = String(req.user._id);
    const isAdmin = Array.isArray(group.admins) && group.admins.some(a => String(a) === requesterId);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can add members' });

    if (group.members.length >= MAX_GROUP_SIZE) return res.status(400).json({ message: `Group size limit reached (${MAX_GROUP_SIZE})` });

  const updated = await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } }, { new: true });
  io.to(`user:${userId}`).emit('group:added', updated);
  logEvent('group.member.added', req.user._id, groupId, { addedUser: userId });
  res.json(updated);
  } catch (err) {
    console.error('addMember error', err.message);
    res.status(500).json({ message: 'Failed to add member' });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findByIdAndUpdate(groupId, { $pull: { members: userId, admins: userId } }, { new: true });
    io.to(`user:${userId}`).emit('group:removed', { groupId });
    res.json(group);
  } catch (err) {
    console.error('removeMember error', err.message);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('members', '_id username fullName profilePhoto').populate('admins', '_id username fullName');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (err) {
    console.error('getGroupById error', err.message);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
};

export const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || '20', 10)));

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // only allow members to list group members
    const requesterId = String(req.user._id);
    if (!group.members.map(m => String(m)).includes(requesterId)) return res.status(403).json({ message: 'You are not a member of this group' });

    // build user query restricted to group members
    const User = (await import('../models/user.model.js')).default;
    const baseQuery = { _id: { $in: group.members } };
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      baseQuery.$or = [ { fullName: regex }, { username: regex }, { email: regex } ];
    }

    const skip = (page - 1) * limit;
    const [members, total] = await Promise.all([
      User.find(baseQuery).select('_id username fullName profilePhoto').skip(skip).limit(limit).lean(),
      User.countDocuments(baseQuery),
    ]);

    res.json({ members, total, page, limit });
  } catch (err) {
    console.error('getGroupMembers error', err.message || err);
    res.status(500).json({ message: 'Failed to fetch group members' });
  }
};

export const promoteMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    // only admins can promote
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const requesterId = String(req.user._id);
    const isAdmin = Array.isArray(group.admins) && group.admins.some(a => String(a) === requesterId);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can promote members' });

    if (Array.isArray(group.admins) && group.admins.length >= MAX_ADMINS) return res.status(400).json({ message: `Admin limit reached (${MAX_ADMINS})` });

  const updated = await Group.findByIdAndUpdate(groupId, { $addToSet: { admins: userId } }, { new: true }).populate('admins', '_id username fullName');
  logEvent('group.member.promoted', req.user._id, groupId, { promoted: userId });
  res.json(updated);
  } catch (err) {
    console.error('promoteMember error', err.message);
    res.status(500).json({ message: 'Failed to promote member' });
  }
};

export const demoteMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const requesterId = String(req.user._id);
    const isAdmin = Array.isArray(group.admins) && group.admins.some(a => String(a) === requesterId);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can demote members' });

  const updated = await Group.findByIdAndUpdate(groupId, { $pull: { admins: userId } }, { new: true }).populate('admins', '_id username fullName');
  logEvent('group.member.demoted', req.user._id, groupId, { demoted: userId });
  res.json(updated);
  } catch (err) {
    console.error('demoteMember error', err.message);
    res.status(500).json({ message: 'Failed to demote member' });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const requesterId = String(req.user._id);
    const isAdmin = Array.isArray(group.admins) && group.admins.some(a => String(a) === requesterId);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can delete group' });

  await Group.findByIdAndDelete(groupId);
    // notify members
    (group.members || []).forEach(m => io.to(`user:${m}`).emit('group:deleted', { groupId }));
  logEvent('group.deleted', req.user._id, groupId, { name: group.name });
    res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error('deleteGroup error', err.message);
    res.status(500).json({ message: 'Failed to delete group' });
  }
};

export const createInvite = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { role = 'member', expiresAt, maxUses = 0 } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const requesterId = String(req.user._id);
    const isAdmin = Array.isArray(group.admins) && group.admins.some(a => String(a) === requesterId);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can create invites' });

  const invite = await GroupInvite.create({ group: groupId, createdBy: requesterId, role, expiresAt: expiresAt || undefined, maxUses });
  logEvent('group.invite.created', req.user._id, groupId, { token: invite.token, role, maxUses });
  res.json({ token: invite.token, expiresAt: invite.expiresAt, maxUses: invite.maxUses });
  } catch (err) {
    console.error('createInvite error', err.message);
    res.status(500).json({ message: 'Failed to create invite' });
  }
};

export const joinWithInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await GroupInvite.findOne({ token });
    if (!invite) return res.status(404).json({ message: 'Invalid invite token' });
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(410).json({ message: 'Invite expired' });
    if (invite.maxUses && invite.uses >= invite.maxUses) return res.status(410).json({ message: 'Invite has been used up' });

    const group = await Group.findById(invite.group);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.members.length >= MAX_GROUP_SIZE) return res.status(400).json({ message: 'Group is full' });

  // add member
  const userId = req.user._id;
  await Group.findByIdAndUpdate(group._id, { $addToSet: { members: userId } });
  // increment uses
  invite.uses = (invite.uses || 0) + 1;
  await invite.save();

  logEvent('group.invite.used', req.user._id, group._id, { invite: invite._id, role: invite.role });

    // if invite role is admin/moderator, update admins (respect limits)
    if (invite.role === 'admin') {
      if (group.admins.length >= MAX_ADMINS) return res.status(400).json({ message: 'Admin limit reached' });
      await Group.findByIdAndUpdate(group._id, { $addToSet: { admins: userId } });
    }

    io.to(`user:${userId}`).emit('group:added', { groupId: group._id });
    res.json({ message: 'Joined group', groupId: group._id });
  } catch (err) {
    console.error('joinWithInvite error', err.message || err);
    res.status(500).json({ message: 'Failed to join with invite' });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, avatar } = req.body;
    // allow members to update per user's request (server-side should enforce admin-only if desired)
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // quick membership check
    if (!group.members.some(m => String(m) === String(req.user._id))) return res.status(403).json({ message: 'You are not a member' });

    const updated = await Group.findByIdAndUpdate(groupId, { ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) }, { new: true });
    // notify members about update
    (updated.members || []).forEach(m => {
      io.to(`user:${m}`).emit('group:updated', { groupId: updated._id, name: updated.name, avatar: updated.avatar });
    });
    res.json(updated);
  } catch (err) {
    console.error('updateGroup error', err.message);
    res.status(500).json({ message: 'Failed to update group' });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { messageId } = req.body;
    const group = await Group.findByIdAndUpdate(groupId, { pinnedMessage: { messageId, pinnedBy: req.user._id, pinnedAt: new Date() } }, { new: true });
    io.to(`room:${groupId}`).emit('group:pinned', { groupId, pinnedMessage: group.pinnedMessage });
    res.json(group.pinnedMessage);
  } catch (err) {
    console.error('pinMessage error', err.message);
    res.status(500).json({ message: 'Failed to pin message' });
  }
};
