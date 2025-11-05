import AnalyticsEvent from '../models/analyticsEvent.model.js';
import AnalyticsSummary from '../models/analyticsSummary.model.js';

export const recordEvent = async (req, res) => {
  try {
    const { eventType, meta = {}, group } = req.body;
    if (!eventType) return res.status(400).json({ message: 'eventType required' });
    const ev = await AnalyticsEvent.create({ eventType, user: req.user?._id, group, meta });
    res.status(201).json(ev);
  } catch (err) {
    console.error('recordEvent error', err.message || err);
    res.status(500).json({ message: 'Failed to record event' });
  }
};

export const getSummary = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    const rows = await AnalyticsSummary.find({ date }).lean();
    res.json(rows);
  } catch (err) {
    console.error('getSummary error', err.message || err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
};
