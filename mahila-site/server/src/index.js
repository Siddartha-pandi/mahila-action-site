import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import pool, { initDb } from "./db.js";
import { readAdminSession } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { contentRouter } from "./routes/content.js";
import { submissionsRouter } from "./routes/submissions.js";
import { cmsRouter } from "./routes/cms.js";
import { volunteerAuthRouter } from "./routes/volunteerAuth.js";

async function seedAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase().trim();
  const password_hash = bcrypt.hashSync(password, 12);
  const existingRes = await pool.query("SELECT id FROM app_admin_users WHERE email = $1", [normalizedEmail]);

  if (existingRes.rows.length > 0) {
    await pool.query("UPDATE app_admin_users SET password_hash = $1 WHERE email = $2", [password_hash, normalizedEmail]);
    console.log(`Admin account synced from env: ${normalizedEmail}`);
  } else {
    await pool.query("INSERT INTO app_admin_users (id, email, password_hash) VALUES ($1, $2, $3)", [
      nanoid(),
      normalizedEmail,
      password_hash,
    ]);
    console.log(`Admin account created from env: ${normalizedEmail}`);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
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
app.use("/api", submissionsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

async function startServer() {
  try {
    await initDb();
    await seedAdminFromEnv();
    app.listen(PORT, () => {
      console.log(`Mahila Action API listening on http://localhost:${PORT}`);
      if (allowedOrigins.length === 0) {
        console.warn("⚠️  CORS_ORIGIN is not set — no browser origins are currently allowed to call this API.");
      }
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

startServer();