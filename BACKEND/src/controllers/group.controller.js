import Group from '../models/group.model.js';
import Message from '../models/message.model.js';
import { io } from '../lib/socket.js';

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds = [], avatar } = req.body;
    const adminId = req.user._id;
    const group = await Group.create({ name, avatar, members: [adminId, ...memberIds], admins: [adminId] });
    // notify members (simple broadcast)
    group.members.forEach(m => io.to(`user:${m}`).emit('group:created', group));
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
    const group = await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } }, { new: true });
    io.to(`user:${userId}`).emit('group:added', group);
    res.json(group);
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
