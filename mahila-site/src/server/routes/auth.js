import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import pool from "../db.js";
import { issueAdminCookie, clearAdminCookie } from "../middleware/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const result = await pool.query("SELECT * FROM app_admin_users WHERE email = $1", [normalizedEmail]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = issueAdminCookie(res, { sub: user.id, email: user.email });
    res.json({ ok: true, email: user.email, jwt: token, token });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

authRouter.get("/session", (req, res) => {
  if (req.admin) return res.json({ loggedIn: true, email: req.admin.email });
  res.json({ loggedIn: false });
});
