import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import db from "./db.js";
import { readAdminSession } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { contentRouter } from "./routes/content.js";
import { submissionsRouter } from "./routes/submissions.js";
import { cmsRouter } from "./routes/cms.js";
import { volunteerAuthRouter } from "./routes/volunteerAuth.js";

// On free hosting tiers (e.g. Render free instance), the filesystem/database
// resets on every restart or spin-down. Re-seeding the admin account from
// environment variables on every boot means you never have to manually
// recreate it after a restart — set ADMIN_EMAIL and ADMIN_PASSWORD in your
// host's environment variables, and this keeps it in sync automatically.
function seedAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase().trim();
  const password_hash = bcrypt.hashSync(password, 12);
  const existing = db.prepare("SELECT id FROM admin_users WHERE email = ?").get(normalizedEmail);

  if (existing) {
    db.prepare("UPDATE admin_users SET password_hash = ? WHERE email = ?").run(password_hash, normalizedEmail);
    console.log(`Admin account synced from env: ${normalizedEmail}`);
  } else {
    db.prepare("INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)").run(
      nanoid(),
      normalizedEmail,
      password_hash
    );
    console.log(`Admin account created from env: ${normalizedEmail}`);
  }
}

seedAdminFromEnv();

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header) and configured origins.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(readAdminSession);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/volunteer-auth", volunteerAuthRouter);
app.use("/api/content", contentRouter);
app.use("/api/cms", cmsRouter);
app.use("/api", submissionsRouter); // /api/donations, /api/reservations, /api/vendors, /api/volunteers, /api/contact

// Centralized error handler (keeps stack traces out of API responses)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Mahila Action API listening on http://localhost:${PORT}`);
  if (allowedOrigins.length === 0) {
    console.warn("⚠️  CORS_ORIGIN is not set — no browser origins are currently allowed to call this API.");
  }
});