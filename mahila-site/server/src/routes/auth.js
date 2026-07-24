import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { issueAdminCookie, clearAdminCookie } from "../middleware/auth.js";

export const authRouter = Router();

// Slow down brute-forcing of the admin login form.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

authRouter.post("/login", loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db
    .prepare("SELECT * FROM admin_users WHERE email = ?")
    .get(String(email).toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  issueAdminCookie(res, { sub: user.id, email: user.email });
  res.json({ ok: true, email: user.email });
});

authRouter.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

// Used by the frontend on load to check if there's an active admin session.
authRouter.get("/session", (req, res) => {
  if (req.admin) return res.json({ loggedIn: true, email: req.admin.email });
  res.json({ loggedIn: false });
});
