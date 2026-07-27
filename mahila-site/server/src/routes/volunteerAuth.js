import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { sendPasswordResetEmail } from "../email.js";

export const volunteerAuthRouter = Router();

// Slow down brute-forcing / spam sign-ups on the public volunteer forms.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

function toProfile(row) {
  return { name: row.name, email: row.email, phone: row.phone, skills: row.skills || "" };
}

volunteerAuthRouter.post("/register", authLimiter, (req, res) => {
  const { name, email, phone, password, skills } = req.body || {};

  if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ error: "Name, email, phone, and password are required." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedPhone = String(phone).trim();

  const existing = db
    .prepare("SELECT email, phone FROM volunteer_accounts WHERE email = ? OR phone = ?")
    .get(normalizedEmail, normalizedPhone);

  if (existing) {
    const field = existing.email === normalizedEmail ? "email address" : "phone number";
    return res.status(409).json({
      error: `An account with this ${field} is already registered. Please sign in instead.`,
    });
  }

  try {
    const id = nanoid();
    const password_hash = bcrypt.hashSync(String(password), 10);
    db.prepare(
      `INSERT INTO volunteer_accounts (id, name, email, phone, password_hash, skills) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name.trim(), normalizedEmail, normalizedPhone, password_hash, skills || null);

    res.status(201).json({
      ok: true,
      profile: toProfile({ name: name.trim(), email: normalizedEmail, phone: normalizedPhone, skills }),
    });
  } catch (err) {
    // Covers a race where two requests with the same email/phone land at the same time.
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "An account with this email or phone number is already registered." });
    }
    console.error("POST /volunteer-auth/register failed:", err);
    res.status(500).json({ error: "Could not create account." });
  }
});

volunteerAuthRouter.post("/login", authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db
    .prepare("SELECT * FROM volunteer_accounts WHERE email = ?")
    .get(String(email).toLowerCase().trim());

  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  res.json({ ok: true, profile: toProfile(user) });
});

volunteerAuthRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email?.trim()) {
    return res.status(400).json({ error: "Email is required." });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = db.prepare("SELECT * FROM volunteer_accounts WHERE email = ?").get(normalizedEmail);

  // Always return the same response whether or not the account exists, so this
  // endpoint can't be used to probe which emails are registered.
  const genericResponse = {
    ok: true,
    message: "If an account exists for that email, we've sent password reset instructions.",
  };

  if (!user) return res.json(genericResponse);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // valid 30 minutes

  db.prepare(
    "UPDATE volunteer_accounts SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?"
  ).run(tokenHash, expires, user.id);

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const resetLink = `${frontendUrl}/?modal=volunteer&kind=reset&id=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetLink);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    // Don't leak the failure to the client — same generic response either way.
  }

  res.json(genericResponse);
});

volunteerAuthRouter.post("/reset-password", authLimiter, (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "Reset token and new password are required." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
  const user = db.prepare("SELECT * FROM volunteer_accounts WHERE reset_token_hash = ?").get(tokenHash);

  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
  }

  const password_hash = bcrypt.hashSync(String(password), 10);
  db.prepare(
    "UPDATE volunteer_accounts SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?"
  ).run(password_hash, user.id);

  res.json({ ok: true, profile: toProfile({ ...user, password_hash: undefined }) });
});
