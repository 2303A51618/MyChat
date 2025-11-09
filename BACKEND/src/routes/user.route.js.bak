import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  searchUsers,
  batchGetUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriends,
} from "../controllers/user.controller.js";

const router = express.Router();

// Search users by query (username, email, fullname)
router.get("/search", protectRoute, searchUsers);

// Get friend list
router.get("/friends", protectRoute, getFriends);

// Send friend request
router.post("/:id/request", protectRoute, sendFriendRequest);

// Accept friend request
router.post("/:id/accept", protectRoute, acceptFriendRequest);

// Decline friend request
router.post("/:id/decline", protectRoute, declineFriendRequest);

// Remove friend
router.post("/:id/remove", protectRoute, removeFriend);

// Block / Unblock user
// Block / Unblock user
router.post("/:id/block", protectRoute, blockUser);
router.post("/:id/unblock", protectRoute, unblockUser);

// Batch user lookup for tooltips
router.get("/batch", protectRoute, batchGetUsers);

export default router;
