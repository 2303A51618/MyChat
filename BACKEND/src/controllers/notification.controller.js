import User from '../models/user.model.js';
import Group from '../models/group.model.js';
import { io } from '../lib/socket.js';
import { sendPushToTokens, initFCM } from '../lib/fcm.js';

// Register a device token for push notifications
export const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token required' });
    const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { deviceTokens: { token, platform } } }, { new: true });
    res.json({ message: 'registered', deviceTokens: user.deviceTokens });
  } catch (err) {
    console.error('registerDeviceToken error', err.message);
    res.status(500).json({ message: 'Failed to register device' });
  }
};

// Admin can send announcement to a group; currently emits socket events and records nothing
export const sendGroupAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, body, data } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const requesterId = String(req.user._id);
    const isAdmin = Array.isArray(group.admins) && group.admins.some(a => String(a) === requesterId);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can send announcements' });

    // emit in-app notification to group members
    (group.members || []).forEach(m => {
      io.to(`user:${m}`).emit('notification', { type: 'group_announcement', groupId, title, body, data });
    });

    // Try sending push notifications via FCM if configured
    try {
      // collect device tokens
      const users = await User.find({ _id: { $in: group.members } }).select('deviceTokens').lean();
      const tokens = [];
      users.forEach(u => {
        (u.deviceTokens || []).forEach(dt => { if (dt && dt.token) tokens.push(dt.token); });
      });
      if (tokens.length > 0) {
        const pushRes = await sendPushToTokens(tokens.slice(0, 500), { title, body, data });
        return res.json({ message: 'Announcement sent', push: pushRes });
      }
    } catch (err) {
      console.error('push send failed', err.message || err);
    }

    res.json({ message: 'Announcement sent' });
  } catch (err) {
    console.error('sendGroupAnnouncement error', err.message);
    res.status(500).json({ message: 'Failed to send announcement' });
  }
};
