import mongoose from 'mongoose';

const analyticsSummarySchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  eventType: { type: String, required: true },
  count: { type: Number, default: 0 },
}, { timestamps: true });

const AnalyticsSummary = mongoose.model('AnalyticsSummary', analyticsSummarySchema);
export default AnalyticsSummary;
