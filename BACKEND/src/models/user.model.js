import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    email:{
        type:String,
        required:true,
        unique:true
    },

    username: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
        trim: true,
    },

    fullName:{
        type:String,
        required:true,
    },

    password:{
        type:String,
        required:true,
    },

    profilePhoto:{
        type:String,
        default:""
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: '' },
    otpExpires: { type: Date, default: null },
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
        about: {
                type: String,
                default: "Hey there! I'm using VASU's Chat App."
            },
      deletedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // <-- new field

      // Friends and friend request tracking
      friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      pendingSent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      pendingReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Users this user has blocked (they cannot send messages to blocker)
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

}, {timestamps:true});

const User=mongoose.model("User",userSchema);
export default User;