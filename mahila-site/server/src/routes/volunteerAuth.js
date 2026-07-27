import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";
import pool from "../db.js";
import { sendPasswordResetEmail } from "../email.js";

import { isValidPhoneNumber } from "../utils/validation.js";

export const volunteerAuthRouter = Router();

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

volunteerAuthRouter.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, password, skills } = req.body || {};

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ error: "Name, email, phone, and password are required." });
    }
    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    const existingRes = await pool.query(
      "SELECT email, phone FROM volunteer_accounts WHERE email = $1 OR phone = $2",
      [normalizedEmail, normalizedPhone]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const field = existing.email === normalizedEmail ? "email address" : "phone number";
      return res.status(409).json({
        error: `An account with this ${field} is already registered. Please sign in instead.`,
      });
    }

    const id = nanoid();
    const password_hash = bcrypt.hashSync(String(password), 10);
    await pool.query(
      `INSERT INTO volunteer_accounts (id, name, email, phone, password_hash, skills) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name.trim(), normalizedEmail, normalizedPhone, password_hash, skills || null]
    );

    res.status(201).json({
      ok: true,
      profile: toProfile({ name: name.trim(), email: normalizedEmail, phone: normalizedPhone, skills }),
    });
  } catch (err) {
    if (String(err.message).includes("unique") || String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "An account with this email or phone number is already registered." });
    }
    next(err);
  }
});

volunteerAuthRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await pool.query("SELECT * FROM volunteer_accounts WHERE email = $1", [
      String(email).toLowerCase().trim(),
    ]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    res.json({ ok: true, profile: toProfile(user) });
  } catch (err) {
    next(err);
  }
});

volunteerAuthRouter.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const result = await pool.query("SELECT * FROM volunteer_accounts WHERE email = $1", [normalizedEmail]);
    const user = result.rows[0];

    const genericResponse = {
      ok: true,
      message: "If an account exists for that email, we've sent password reset instructions.",
    };

    if (!user) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await pool.query(
      "UPDATE volunteer_accounts SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3",
      [tokenHash, expires, user.id]
    );

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetLink = `${frontendUrl}/?modal=volunteer&kind=reset&id=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
});

volunteerAuthRouter.post("/reset-password", authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: "Reset token and new password are required." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const result = await pool.query("SELECT * FROM volunteer_accounts WHERE reset_token_hash = $1", [tokenHash]);
    const user = result.rows[0];

    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    }

    const password_hash = bcrypt.hashSync(String(password), 10);
    await pool.query(
      "UPDATE volunteer_accounts SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2",
      [password_hash, user.id]
    );

    res.json({ ok: true, profile: toProfile({ ...user, password_hash: undefined }) });
  } catch (err) {
    next(err);
  }
});
