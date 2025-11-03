import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  url: String,
  type: String,
  filename: String,
  size: Number,
}, { _id: false });

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // user chat or group id
  isGroup: { type: Boolean, default: false },
  content: { type: String, default: '' },
  attachments: [attachmentSchema],
  reactions: [reactionSchema],
  status: { type: String, enum: ['sent','delivered','read'], default: 'sent' },
}, { timestamps: true });

messageSchema.index({ content: 'text' });
messageSchema.index({ chatId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;