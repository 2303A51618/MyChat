import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reason: { type: String, required: true },
  status: { type: String, enum: ['open','reviewed','closed'], default: 'open' },
  actionTaken: { type: String, default: '' },
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;
