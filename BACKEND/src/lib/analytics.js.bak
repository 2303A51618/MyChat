import AnalyticsEvent from '../models/analyticsEvent.model.js';
import AnalyticsSummary from '../models/analyticsSummary.model.js';

// perform aggregation for a specific date (YYYY-MM-DD)
export const runAggregationForDate = async (dateStr) => {
  try {
    const pipeline = [
      { $match: { createdAt: { $gte: new Date(dateStr + 'T00:00:00.000Z'), $lt: new Date(dateStr + 'T23:59:59.999Z') } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ];
    const rows = await AnalyticsEvent.aggregate(pipeline);
    for (const r of rows) {
      await AnalyticsSummary.findOneAndUpdate({ date: dateStr, eventType: r._id }, { $set: { count: r.count } }, { upsert: true });
    }
    console.log('Analytics aggregation done for', dateStr);
    return { ok: true, date: dateStr, rows };
  } catch (err) {
    console.error('Aggregation failed for', dateStr, err?.message || err);
    throw err;
  }
};

// start daily cron at 00:05 UTC if ANALYTICS_ENABLED env var is set to 'true'
export const startAnalyticsCron = async () => {
  if (String(process.env.ANALYTICS_ENABLED || '').toLowerCase() !== 'true') {
    console.debug('Analytics disabled via ANALYTICS_ENABLED env');
    return;
  }

  let cron = null;
  try {
    // dynamic import so server doesn't crash if node-cron is not installed
    cron = (await import('node-cron')).default;
  } catch (err) {
    console.debug('node-cron not available, analytics cron disabled', err?.message || err);
    return;
  }

  try {
    cron.schedule('5 0 * * *', async () => {
      const yesterday = new Date(Date.now() - 24*60*60*1000);
      const dateStr = yesterday.toISOString().slice(0,10);
      try {
        await runAggregationForDate(dateStr);
      } catch (err) {
        console.error('Analytics cron failed', err.message || err);
      }
    });
    console.log('Analytics cron scheduled (00:05 UTC)');
  } catch (err) {
    console.error('Failed to schedule analytics cron', err.message || err);
  }
};
