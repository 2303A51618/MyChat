import Report from '../models/report.model.js';
import User from '../models/user.model.js';

export const createReport = async (req, res) => {
  try {
    const { targetUser, targetMessage, reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'reason required' });
    const r = await Report.create({ reporter: req.user._id, targetUser, targetMessage, reason });
    res.status(201).json(r);
  } catch (err) {
    console.error('createReport error', err.message);
    res.status(500).json({ message: 'Failed to create report' });
  }
};

// Admin-only: list reports
export const listReports = async (req, res) => {
  try {
    if (!req.user.isGlobalAdmin) return res.status(403).json({ message: 'Not authorized' });
    const reports = await Report.find().populate('reporter', '_id username fullName').populate('targetUser', '_id username fullName').populate('targetMessage');
    res.json(reports);
  } catch (err) {
    console.error('listReports error', err.message);
    res.status(500).json({ message: 'Failed to list reports' });
  }
};

export const takeAction = async (req, res) => {
  try {
    if (!req.user.isGlobalAdmin) return res.status(403).json({ message: 'Not authorized' });
    const { reportId } = req.params;
    const { action, muteUntil, ban } = req.body;
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // perform action on target user if present
    if (report.targetUser) {
      const u = await User.findById(report.targetUser);
      if (u) {
        if (muteUntil) u.mutedUntil = new Date(muteUntil);
        if (ban !== undefined) u.banned = !!ban;
        await u.save();
      }
    }

    report.status = 'reviewed';
    report.actionTaken = action || '';
    await report.save();
    res.json({ message: 'Action taken', report });
  } catch (err) {
    console.error('takeAction error', err.message);
    res.status(500).json({ message: 'Failed to take action' });
  }
};
