import mongoose from 'mongoose';
import crypto from 'crypto';

const groupInviteSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  token: { type: String, required: true, unique: true, default: () => crypto.randomBytes(16).toString('hex') },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['member','moderator','admin'], default: 'member' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) }, // 7 days
  maxUses: { type: Number, default: 0 }, // 0 => unlimited
  uses: { type: Number, default: 0 },
}, { timestamps: true });

const GroupInvite = mongoose.model('GroupInvite', groupInviteSchema);
export default GroupInvite;
