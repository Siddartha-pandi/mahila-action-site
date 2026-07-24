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
    // GitHub Pages and this API live on different origins, which makes every
    // request cross-site. SameSite=Lax cookies are NOT sent on cross-site
    // fetch/XHR (only on top-level navigations), so the admin session would
    // silently fail to authenticate in production. SameSite=None requires
    // Secure=true (browsers reject it otherwise), which is why this is tied
    // to COOKIE_SECURE rather than a separate setting.
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAdminCookie(res) {
  const secure = process.env.COOKIE_SECURE === "true";
  res.clearCookie(COOKIE_NAME, { path: "/", sameSite: secure ? "none" : "lax", secure });
}

// Attaches req.admin if a valid session cookie is present; does not block the request.
export function readAdminSession(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      req.admin = jwt.verify(token, JWT_SECRET);
    } catch {
      req.admin = null;
    }
  }
  next();
}

// Blocks the request unless a valid admin session is present.
export function requireAdmin(req, res, next) {
  if (!req.admin) return res.status(401).json({ error: "Not authenticated" });
  next();
}
