import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  event: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  target: { type: mongoose.Schema.Types.ObjectId },
  meta: { type: Object, default: {} },
}, { timestamps: true });

const Audit = mongoose.model('Audit', auditSchema);
export default Audit;
