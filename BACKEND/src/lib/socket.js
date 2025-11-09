import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

// Allow origins configured via FRONTEND_URL (comma-separated) or default to localhost during dev
const cfg = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = cfg ? (cfg.includes(",") ? cfg.split(",").map(s => s.trim()).filter(Boolean) : [cfg.trim()]) : [];
console.log("Socket allowed origins:", allowedOrigins);

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
                // allow non-browser or same-origin
                if (!origin) return callback(null, true);
                if (allowedOrigins.length === 0) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                // allow Netlify preview subdomains
                try {
                    const originHost = new URL(origin).hostname;
                    if (originHost && originHost.endsWith('.netlify.app')) return callback(null, true);
                } catch (e) {}
                console.warn(`Socket CORS blocked origin: ${origin}`);
                return callback(null, false);
            },
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// support multiple sockets per user (multiple tabs/devices)
const userSocketMap = {}; // { userId: Set(socketId) }

export function getReceiverSocketId(userId) {
    const set = userSocketMap[userId];
    if (!set) return null;
    // return one socket id (first)
    return Array.from(set.values())[0];
}

io.on("connection", async (socket) => {
    console.log("A user connected", socket.id);

    const rawUserId = socket.handshake.query.userId;
    // clients sometimes send the literal string 'undefined' which is truthy
    const userId = rawUserId && rawUserId !== 'undefined' ? rawUserId : null;
        if (userId) {
            if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
            userSocketMap[userId].add(socket.id);

            // mark user online in DB
            try {
                await User.findByIdAndUpdate(userId, { online: true, lastSeen: null });
            } catch (err) {
                console.error("Error updating user online status:", err.message);
            }

            // join a personal room for easier targeting
            socket.join(`user:${userId}`);

                // notify friends only (reduce noise & privacy)
                try {
                    const user = await User.findById(userId).select('friends');
                    const friends = (user && Array.isArray(user.friends)) ? user.friends.map(String) : [];

                    // notify each friend that this user is online
                    friends.forEach(friendId => {
                        io.to(`user:${friendId}`).emit('presence:update', { userId, online: true });
                    });

                    // send the connecting user a list of which of their friends are currently online
                    const onlineFriends = friends.filter(fid => userSocketMap[fid] && userSocketMap[fid].size > 0);
                    socket.emit('getOnlineUsers', onlineFriends);
                } catch (err) {
                    console.error('Error notifying friends about presence:', err.message);
                }
        }

        socket.on("disconnect", async () => {
        console.log("A user disconnected", socket.id);
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId].delete(socket.id);
            if (userSocketMap[userId].size === 0) {
                delete userSocketMap[userId];
                try {
                    await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
                } catch (err) {
                    console.error("Error updating user lastSeen:", err.message);
                }
                // notify friends only that this user went offline
                try {
                    const user = await User.findById(userId).select('friends');
                    const friends = (user && Array.isArray(user.friends)) ? user.friends.map(String) : [];
                    friends.forEach(friendId => {
                        io.to(`user:${friendId}`).emit('presence:update', { userId, online: false, lastSeen: new Date() });
                    });
                } catch (err) {
                    console.error('Error notifying friends about offline presence:', err.message);
                }
            }
            // optionally: we could emit per-user online lists, but avoid global broadcast
        }
        });

        // join/leave chat rooms (client will ask to join when opening a chat)
        socket.on('joinRoom', (roomId) => {
            if (!roomId) return;
            socket.join(`room:${roomId}`);
        });

        socket.on('leaveRoom', (roomId) => {
            if (!roomId) return;
            socket.leave(`room:${roomId}`);
        });
});

export { io, app, server };