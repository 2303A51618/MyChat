import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import mediaRoutes from "./routes/media.route.js";
import groupRoutes from "./routes/group.route.js";
import notificationRoutes from "./routes/notification.route.js";
import userRoutes from "./routes/user.route.js";
import moderationRoutes from './routes/moderation.route.js';
import analyticsRoutes from './routes/analytics.route.js';
import { startAnalyticsCron } from './lib/analytics.js';
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(cookieParser());
app.use(
  // allow FRONTEND_URL (set in Render) or default to localhost dev port
  // FRONTEND_URL may be a single origin or a comma-separated list of origins
  cors({
    origin: (() => {
      const cfg = process.env.FRONTEND_URL || "http://localhost:5173";
      if (cfg.includes(",")) return cfg.split(",").map((s) => s.trim());
      return cfg;
    })(),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/analytics', analyticsRoutes);

// start analytics cron if configured
try { startAnalyticsCron(); } catch (err) { console.debug('analytics cron not started', err); }

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../FRONTEND/dist")));

  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, "../FRONTEND", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});