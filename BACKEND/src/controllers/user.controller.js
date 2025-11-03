import User from "../models/user.model.js";
import { io } from "../lib/socket.js";
import mongoose from "mongoose";

export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q.trim()) return res.json({ users: [] });

    const regex = new RegExp(q, "i");

    // search by username or email or fullName
    const users = await User.find({
      $or: [{ username: regex }, { email: regex }, { fullName: regex }],
    })
      .select("_id username email fullName profilePhoto about")
      .limit(20);

    // Exclude current user from results
    const filtered = users.filter((u) => String(u._id) !== String(req.user._id));

    res.json({ users: filtered });
  } catch (error) {
    console.error("searchUsers error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("friends", "_id username fullName profilePhoto about")
      .populate("pendingSent", "_id username fullName profilePhoto about")
      .populate("pendingReceived", "_id username fullName profilePhoto about");

    res.json({
      friends: user.friends || [],
      pendingSent: user.pendingSent || [],
      pendingReceived: user.pendingReceived || [],
    });
  } catch (error) {
    console.error("getFriends error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ message: "Invalid user id" });
    if (String(targetId) === String(req.user._id)) return res.status(400).json({ message: "Cannot send request to yourself" });

    const [sender, target] = await Promise.all([
      User.findById(req.user._id),
      User.findById(targetId),
    ]);

    if (!target) return res.status(404).json({ message: "Target user not found" });

    // already friends
    if (sender.friends.some((f) => String(f) === String(target._id))) {
      return res.status(400).json({ message: "Already friends" });
    }

    // already sent
    if (sender.pendingSent.some((p) => String(p) === String(target._id))) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // if target already sent request to me, accept immediately
    if (sender.pendingReceived.some((p) => String(p) === String(target._id))) {
      // move both to friends
      sender.pendingReceived = sender.pendingReceived.filter((p) => String(p) !== String(target._id));
      sender.friends.push(target._id);
      target.pendingSent = target.pendingSent.filter((p) => String(p) !== String(sender._id));
      target.friends.push(sender._id);

      await Promise.all([sender.save(), target.save()]);

      // notify the original requester (target) that their request was accepted
      try {
        io.to(`user:${target._id}`).emit("friend:request:accepted", {
          by: {
            _id: sender._id,
            username: sender.username,
            fullName: sender.fullName,
            profilePhoto: sender.profilePhoto,
          },
        });
      } catch (err) {
        console.error("socket emit friend:request:accepted (auto) error", err.message);
      }

      return res.json({ message: "Friend request accepted automatically", friends: sender.friends });
    }

    // otherwise add pending
    sender.pendingSent.push(target._id);
    target.pendingReceived.push(sender._id);

    await Promise.all([sender.save(), target.save()]);

    // emit socket notification to target (if online)
    try {
      io.to(`user:${target._id}`).emit("friend:request", {
        from: {
          _id: sender._id,
          username: sender.username,
          fullName: sender.fullName,
          profilePhoto: sender.profilePhoto,
        },
      });
    } catch (err) {
      console.error("socket emit friend:request error", err.message);
    }

    res.json({ message: "Friend request sent" });
  } catch (error) {
    console.error("sendFriendRequest error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const fromId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(fromId)) return res.status(400).json({ message: "Invalid user id" });

    const [me, fromUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(fromId),
    ]);

    if (!fromUser) return res.status(404).json({ message: "User not found" });

    // Check request exists
    if (!me.pendingReceived.some((p) => String(p) === String(fromUser._id))) {
      return res.status(400).json({ message: "No friend request from this user" });
    }

    me.pendingReceived = me.pendingReceived.filter((p) => String(p) !== String(fromUser._id));
    fromUser.pendingSent = fromUser.pendingSent.filter((p) => String(p) !== String(me._id));

    // add each other as friends (avoid duplicates)
    if (!me.friends.some((f) => String(f) === String(fromUser._id))) me.friends.push(fromUser._id);
    if (!fromUser.friends.some((f) => String(f) === String(me._id))) fromUser.friends.push(me._id);

    await Promise.all([me.save(), fromUser.save()]);

    // notify the requester (fromUser) that their request was accepted
    try {
      io.to(`user:${fromUser._id}`).emit("friend:request:accepted", {
        by: {
          _id: me._id,
          username: me.username,
          fullName: me.fullName,
          profilePhoto: me.profilePhoto,
        },
      });
    } catch (err) {
      console.error("socket emit friend:request:accepted error", err.message);
    }

    res.json({ message: "Friend request accepted", friends: me.friends });
  } catch (error) {
    console.error("acceptFriendRequest error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const fromId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(fromId)) return res.status(400).json({ message: "Invalid user id" });

    const [me, fromUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(fromId),
    ]);

    if (!fromUser) return res.status(404).json({ message: "User not found" });
    if (!me.pendingReceived.some((p) => String(p) === String(fromUser._id))) {
      return res.status(400).json({ message: "No friend request from this user" });
    }

    me.pendingReceived = me.pendingReceived.filter((p) => String(p) !== String(fromUser._id));
    fromUser.pendingSent = fromUser.pendingSent.filter((p) => String(p) !== String(me._id));

    await Promise.all([me.save(), fromUser.save()]);

    // notify the requester that the request was declined
    try {
      io.to(`user:${fromUser._id}`).emit("friend:request:declined", {
        by: {
          _id: me._id,
          username: me.username,
        },
      });
    } catch (err) {
      console.error("socket emit friend:request:declined error", err.message);
    }

    res.json({ message: "Friend request declined" });
  } catch (error) {
    console.error("declineFriendRequest error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const otherId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(otherId)) return res.status(400).json({ message: "Invalid user id" });

    const [me, other] = await Promise.all([
      User.findById(req.user._id),
      User.findById(otherId),
    ]);

    if (!other) return res.status(404).json({ message: "User not found" });

    me.friends = me.friends.filter((f) => String(f) !== String(other._id));
    other.friends = other.friends.filter((f) => String(f) !== String(me._id));

    // also clean any pending entries
    me.pendingReceived = me.pendingReceived.filter((p) => String(p) !== String(other._id));
    me.pendingSent = me.pendingSent.filter((p) => String(p) !== String(other._id));
    other.pendingReceived = other.pendingReceived.filter((p) => String(p) !== String(me._id));
    other.pendingSent = other.pendingSent.filter((p) => String(p) !== String(me._id));

    await Promise.all([me.save(), other.save()]);

    // notify the other user that they were removed
    try {
      io.to(`user:${other._id}`).emit("friend:removed", {
        by: {
          _id: me._id,
          username: me.username,
        },
      });
    } catch (err) {
      console.error("socket emit friend:removed error", err.message);
    }

    res.json({ message: "Friend removed" });
  } catch (error) {
    console.error("removeFriend error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Batch fetch users by ids (for reaction tooltips)
export const batchGetUsers = async (req, res) => {
  try {
    const idsParam = req.query.ids || '';
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.json({ users: [] });

    const objectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    const users = await User.find({ _id: { $in: objectIds } }).select('_id username fullName profilePhoto');
    res.json({ users });
  } catch (error) {
    console.error('batchGetUsers error', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const blockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ message: "Invalid user id" });
    if (String(targetId) === String(req.user._id)) return res.status(400).json({ message: "Cannot block yourself" });

    const [me, target] = await Promise.all([
      User.findById(req.user._id),
      User.findById(targetId),
    ]);

    if (!target) return res.status(404).json({ message: "User not found" });

    // add to blockedUsers if not already
    if (!me.blockedUsers.some((b) => String(b) === String(target._id))) {
      me.blockedUsers.push(target._id);
    }

    // remove friendship and pending entries as blocking implies no friendship
    me.friends = me.friends.filter((f) => String(f) !== String(target._id));
    target.friends = target.friends.filter((f) => String(f) !== String(me._id));

    me.pendingReceived = me.pendingReceived.filter((p) => String(p) !== String(target._id));
    me.pendingSent = me.pendingSent.filter((p) => String(p) !== String(target._id));
    target.pendingReceived = target.pendingReceived.filter((p) => String(p) !== String(me._id));
    target.pendingSent = target.pendingSent.filter((p) => String(p) !== String(me._id));

    await Promise.all([me.save(), target.save()]);

    // notify the other user they were removed/blocked
    try {
      io.to(`user:${target._id}`).emit("friend:removed", {
        by: {
          _id: me._id,
          username: me.username,
        },
      });
      io.to(`user:${target._id}`).emit("friend:blocked", {
        by: {
          _id: me._id,
          username: me.username,
        },
      });
    } catch (err) {
      console.error("socket emit block events error", err.message);
    }

    res.json({ message: "User blocked" });
  } catch (error) {
    console.error("blockUser error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ message: "Invalid user id" });
    if (String(targetId) === String(req.user._id)) return res.status(400).json({ message: "Cannot unblock yourself" });

    const [me, target] = await Promise.all([
      User.findById(req.user._id),
      User.findById(targetId),
    ]);

    if (!target) return res.status(404).json({ message: "User not found" });

    me.blockedUsers = me.blockedUsers.filter((b) => String(b) !== String(target._id));
    await me.save();

    try {
      io.to(`user:${target._id}`).emit("friend:unblocked", {
        by: {
          _id: me._id,
          username: me.username,
        },
      });
    } catch (err) {
      console.error("socket emit unblock error", err.message);
    }

    res.json({ message: "User unblocked" });
  } catch (error) {
    console.error("unblockUser error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
