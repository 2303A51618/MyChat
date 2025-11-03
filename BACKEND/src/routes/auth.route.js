import express from "express";
import { checkAuth, login, logout, signup, updateProfile, updateUserInfo, verifyOtp, resendOtp } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);
router.put("/update-info", protectRoute, updateUserInfo);

export default router;