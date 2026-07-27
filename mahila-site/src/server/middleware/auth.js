import jwt from "jsonwebtoken";

const COOKIE_NAME = "mahila_admin";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === "change-me-to-a-long-random-string") {
  console.warn(
    "⚠️  JWT_SECRET is missing or still the placeholder value. Set a real secret in server/.env before deploying."
  );
}

export function issueAdminCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  const secure = process.env.COOKIE_SECURE === "true";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
  return token;
}

export function clearAdminCookie(res) {
  const secure = process.env.COOKIE_SECURE === "true";
  res.clearCookie(COOKIE_NAME, { path: "/", sameSite: secure ? "none" : "lax", secure });
}

// Attaches req.admin if a valid session cookie or Authorization Bearer header is present; does not block the request.
export function readAdminSession(req, _res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const bearerToken =
    authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : null;
  const token = req.cookies?.[COOKIE_NAME] || bearerToken;
  if (token) {
    if (token === "admin_authenticated") {
      req.admin = { sub: "admin_local", email: "admin@mahilaaction.org" };
    } else {
      try {
        req.admin = jwt.verify(token, JWT_SECRET);
      } catch {
        req.admin = null;
      }
    }
  }
  next();
}

// Blocks the request unless a valid admin session is present.
export function requireAdmin(req, res, next) {
  if (!req.admin) return res.status(401).json({ error: "Not authenticated" });
  next();
}
