import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { compressBase64Image } from '../lib/imageUtils.js';
import { io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const currentUser = await User.findById(loggedInUserId);
    const deletedChats = currentUser?.deletedChats || [];

    // Only return real users: those with an email, a password and verified via OTP
    const users = await User.find({
      _id: { $ne: loggedInUserId, $nin: deletedChats },
      email: { $exists: true, $ne: "" },
      password: { $exists: true, $ne: "" },
      isVerified: true,
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};




export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // if the id corresponds to a group -> return group messages
    const maybeGroup = await Group.findById(userToChatId).select('_id');
    if (maybeGroup) {
      const messages = await Message.find({ chatId: userToChatId, isGroup: true }).sort({ createdAt: 1 });
      return res.status(200).json(messages);
    }

    // For backwards-compatible 1:1 chats we saved chatId as the other user's id
    const messages = await Message.find({
      $or: [
        { sender: myId, chatId: userToChatId, isGroup: false },
        { sender: userToChatId, chatId: myId, isGroup: false },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    let attachments = [];
    if (image) {
      try {
        const { buffer, format } = await compressBase64Image(image, { maxWidth: 1280, quality: 80 });
        const uploadResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ folder: 'chat_uploads', resource_type: 'image', format }, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
          uploadStream.end(buffer);
        });
        attachments.push({ url: uploadResponse.secure_url, type: uploadResponse.resource_type, filename: uploadResponse.original_filename });
      } catch (err) {
        console.error('Cloudinary upload failed:', err.message);
      }
    }

    // Check if receiverId is a group id
    const maybeGroup = await Group.findById(receiverId).select('members');
    if (maybeGroup) {
      // ensure sender is a member
      const isMember = Array.isArray(maybeGroup.members) && maybeGroup.members.some(m => String(m) === String(senderId));
      if (!isMember) return res.status(403).json({ message: 'You are not a member of this group' });

      const newMessage = new Message({
        sender: senderId,
        chatId: receiverId,
        isGroup: true,
        content: text || '',
        attachments,
        status: 'sent',
      });

      await newMessage.save();

      // emit to the group's room
      io.to(`room:${receiverId}`).emit('newMessage', newMessage);

      return res.status(201).json(newMessage);
    }

    // enforce block / friendship rules for 1:1
    const [senderUser, receiverUser] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);

    if (!receiverUser) return res.status(404).json({ message: 'Receiver not found' });

    // if receiver has blocked sender
    if (Array.isArray(receiverUser.blockedUsers) && receiverUser.blockedUsers.some(b => String(b) === String(senderId))) {
      return res.status(403).json({ message: 'You are blocked by this user' });
    }

    // Note: direct chat allowed with anyone. Friendship not required.

    const newMessage = new Message({
      sender: senderId,
      chatId: receiverId,
      isGroup: false,
      content: text || '',
      attachments,
      status: 'sent',
    });

    await newMessage.save();

    // emit to the receiver's personal room so all their sockets get it
    io.to(`user:${receiverId}`).emit('newMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error);
    // return error message to client when possible to aid debugging
    const msg = (error && error.message) ? error.message : 'Internal server error';
    res.status(500).json({ message: msg });
  }}

  export const deleteChats = async (req, res) => {
    try {
      console.log("🔍 deleteChats called");
      console.log("req.user:", req.user);
      console.log("req.body:", req.body);
      
      const loggedInUserId = req.user._id;
      if (!loggedInUserId) {
        console.error("❌ No logged-in user");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { userIds } = req.body;
      console.log("userIds received:", userIds);
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "No chats selected for deletion" });
      }
      
      const validUserIds = userIds.filter(id => 
        mongoose.Types.ObjectId.isValid(id) && id !== loggedInUserId.toString()
      );
      if (validUserIds.length !== userIds.length) {
        return res.status(400).json({ error: "Invalid user IDs provided" });
      }
      
      console.log("Valid userIds to delete:", validUserIds);
      
      // Build filters for messages (both directions)
      const deleteFilters = validUserIds.flatMap((userId) => [
        { senderId: loggedInUserId, receiverId: userId },
        { senderId: userId, receiverId: loggedInUserId },
      ]);
      
      console.log("Delete filters:", deleteFilters);
      
      // Soft-delete the chats for the requesting user by storing the deleted user ids
      await User.findByIdAndUpdate(loggedInUserId, {
        $addToSet: { deletedChats: { $each: validUserIds } }
      });

      // Emit real-time updates to the requesting user's sockets so UI can update
      io.to(`user:${loggedInUserId}`).emit("chatsDeleted", { deletedUserIds: validUserIds });

      res.status(200).json({
        success: true,
        message: `Chats removed from your view`,
        deletedUserIds: validUserIds,
      });
    } catch (error) {
      console.error("❌ Full error:", error.stack);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  };

  export const toggleReaction = async (req, res) => {
    try {
      const { id: messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user._id;

      const msg = await Message.findById(messageId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      const reaction = msg.reactions.find(r => r.emoji === emoji);
      if (reaction) {
        const has = reaction.userIds.some(u => u.toString() === userId.toString());
        if (has) reaction.userIds = reaction.userIds.filter(u => u.toString() !== userId.toString());
        else reaction.userIds.push(userId);
      } else {
        msg.reactions.push({ emoji, userIds: [userId] });
      }

      await msg.save();

      // broadcast update
      io.to(`room:${msg.chatId}`).emit('message:reaction', { messageId, reactions: msg.reactions });

      res.json(msg.reactions);
    } catch (err) {
      console.error('toggleReaction error', err.message);
      res.status(500).json({ message: 'Failed to toggle reaction' });
    }
  };