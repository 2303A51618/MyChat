import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { compressBase64Image } from '../lib/imageUtils.js';
import { sendOtpEmail } from "../lib/mailer.js";
import crypto from 'crypto';

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user as unverified
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    newUser.otp = otp;
    newUser.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await newUser.save();

    // send otp email (best-effort)
    try {
      await sendOtpEmail(newUser.email, otp);
    } catch (err) {
      console.error('Failed to send OTP email', err);
    }

    res.status(201).json({ message: 'OTP sent to email', email: newUser.email });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and otp are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (!user.otp || !user.otpExpires) return res.status(400).json({ message: 'No OTP found' });
    if (Date.now() > user.otpExpires) return res.status(400).json({ message: 'OTP expired' });
    if (String(user.otp) !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });

    user.isVerified = true;
    user.otp = '';
    user.otpExpires = null;
    await user.save();

    // generate jwt and return user
    generateToken(user._id, res);
    res.json({ _id: user._id, fullName: user.fullName, email: user.email, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error('verifyOtp error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try { await sendOtpEmail(user.email, otp); } catch (err) { console.error('resend otp err', err); }

    res.json({ message: 'OTP resent' });
  } catch (err) {
    console.error('resendOtp error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePhoto } = req.body;
    const userId = req.user._id;

    if (!profilePhoto) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // compress and upload profile photo if provided
    let updatedUser = null;
    if (profilePhoto) {
      try {
        const { buffer, format } = await compressBase64Image(profilePhoto, { maxWidth: 800, quality: 85 });
        const uploadResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ folder: 'profile_photos', resource_type: 'image', format }, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
          uploadStream.end(buffer);
        });

        updatedUser = await User.findByIdAndUpdate(
          userId,
          { profilePhoto: uploadResponse.secure_url },
          { new: true }
        );
      } catch (err) {
        console.error('error uploading profile photo', err.message);
        return res.status(500).json({ message: 'Failed to upload profile photo' });
      }
    } else {
      return res.status(400).json({ message: 'Profile pic is required' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUserInfo=async(req,res)=>{
  try{
    const userId = req.user._id; // From auth middleware
    const { fullName, about } = req.body;

    if(!fullName){
      return res.status(400).json({message:"Full name and bio are required"})
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fullName, about },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user info:", error);
    res.status(500).json({ message: "Internal server error" });
  }
  
}