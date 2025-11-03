import mongoose from 'mongoose';

const pinnedSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pinnedAt: { type: Date, default: Date.now }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  avatar: { type: String, default: '' },
  pinnedMessage: pinnedSchema,
}, { timestamps: true });

const Group = mongoose.model('Group', groupSchema);
export default Group;
