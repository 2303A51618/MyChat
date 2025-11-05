import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  meta: { type: Object, default: {} },
}, { timestamps: true });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
export default AnalyticsEvent;
