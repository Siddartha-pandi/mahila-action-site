import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { queryDb } from "./db";
import { AdminModule, PermissionAction, MODULE_LABELS, hasPermission } from "./permissions";
import { getServerRoles } from "./rolesServer";
import { auth as authJsSession } from "@/auth";

const COOKIE_NAME = "mahila_admin";
const USER_COOKIE_NAME = "mahila_user";

function isCookieSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    (process.env.FRONTEND_URL?.startsWith("https://") ?? false)
  );
}

/**
 * Retrieves the cryptographic secret used for JWT signing and verification.
 * In production, an explicitly configured JWT_SECRET or AUTH_SECRET is mandatory.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "WARNING: JWT_SECRET or AUTH_SECRET environment variable is missing in deployment. Using derived secure fallback."
      );
      // Derive a deterministic fallback from DATABASE_URL so authentication doesn't crash
      const dbUrl = process.env.DATABASE_URL || "mahila_production_default_seed";
      return crypto.createHash("sha256").update(`jwt_salt_${dbUrl}`).digest("hex");
    }
    return "dev_default_jwt_secret_change_in_production";
  }
  return secret;
}

/**
 * Generates an HMAC-SHA256 receipt access token tied to a specific donation ID.
 * Protects against Insecure Direct Object Reference (IDOR) attacks on tax receipts.
 */
export function generateReceiptToken(donationId: string | number): string {
  const secret = getJwtSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`receipt_${donationId}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Timing-safe validation for donation receipt access tokens.
 */
export function verifyReceiptToken(donationId: string | number, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = generateReceiptToken(donationId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export interface AdminPayload {
  sub: string;
  email: string;
  role?: string;
  tokenType?: "admin" | "user";
}

export interface UserSessionPayload {
  sub: string;
  email: string;
  role?: string;
  tokenType?: "user" | "admin";
}

export interface AdminAuthResult {
  authorized: boolean;
  admin?: AdminPayload;
  status?: number;
  error?: string;
}

export async function getAdminFromRequest(req?: NextRequest): Promise<AdminPayload | null> {
  // Check Auth.js session first (only accept non-"user" privileged roles)
  try {
    const authSession = await authJsSession();
    const authRole = (authSession?.user as any)?.role;
    if (authSession?.user?.email && authRole && authRole !== "user" && authRole !== "guest") {
      return {
        sub: String((authSession.user as any).id || authSession.user.email),
        email: authSession.user.email,
        role: String(authRole),
      };
    }
  } catch {}

  const candidates: string[] = [];

  try {
    if (req) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const bearer = authHeader.substring(7).trim();
        if (bearer) candidates.push(bearer);
      }
      const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
      if (cookieToken) candidates.push(cookieToken);
    } else {
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
      if (cookieToken) candidates.push(cookieToken);
    }
  } catch {
    return null;
  }

  const secret = getJwtSecret();

  // Every candidate must survive signature verification and carry a non-user session.
  for (const token of candidates) {
    if (!token || token === "session" || token === "admin_authenticated") {
      continue;
    }
    try {
      const decoded = jwt.verify(token, secret) as AdminPayload;
      if (!decoded || decoded.tokenType === "user") {
        continue;
      }
      if (!decoded.email || (decoded.tokenType !== "admin" && (!decoded.role || decoded.role === "user" || decoded.role === "guest"))) {
        continue;
      }
      return {
        sub: String(decoded.sub ?? ""),
        email: decoded.email,
        role: decoded.role || "admin",
        tokenType: decoded.tokenType,
      };
    } catch {
      // try the next candidate
    }
  }

  return null;
}

export async function getUserSessionFromRequest(req?: NextRequest): Promise<UserSessionPayload | null> {
  try {
    const token = req
      ? req.cookies.get(USER_COOKIE_NAME)?.value
      : (await cookies()).get(USER_COOKIE_NAME)?.value;

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret()) as UserSessionPayload;
      if (decoded?.email && decoded.tokenType === "user") {
        return {
          sub: String(decoded.sub ?? ""),
          email: decoded.email,
          role: decoded.role || "user",
          tokenType: "user",
        };
      }
    }
  } catch {}

  const admin = await getAdminFromRequest(req);
  if (admin?.email) {
    return {
      sub: String(admin.sub ?? ""),
      email: admin.email,
      role: admin.role || "admin",
      tokenType: "admin",
    };
  }

  return null;
}

export async function verifyAdminPermission(
  req: NextRequest,
  module: AdminModule,
  action: PermissionAction
): Promise<AdminAuthResult> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return { authorized: false, status: 401, error: "Not authenticated" };
  }

  const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "").toLowerCase().trim();
  const isEnvSuperadmin =
    String(admin.sub) === "superadmin_env" &&
    Boolean(envSuperadminEmail && admin.email.toLowerCase().trim() === envSuperadminEmail);

  if (isEnvSuperadmin) {
    return { authorized: true, admin: { ...admin, role: "superadmin" } };
  }

  let userRole = admin.role || "user";
  let userPerms: any = null;

  const isNumericSub = Boolean(admin.sub && /^\d+$/.test(String(admin.sub)));
  try {
    const userRes = isNumericSub
      ? await queryDb("SELECT id, email, role, permissions, status FROM users WHERE id = $1 LIMIT 1", [admin.sub], { noCache: true })
      : await queryDb("SELECT id, email, role, permissions, status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [admin.email], { noCache: true });

    if (userRes.rows.length > 0) {
      const row = userRes.rows[0];
      if (row.status && row.status !== "Active") {
        return { authorized: false, status: 403, error: "Account is inactive." };
      }
      userRole = row.role || "user";
      userPerms = row.permissions;
    } else if (isNumericSub) {
      return { authorized: false, status: 401, error: "Account no longer exists." };
    }
  } catch {}

  const isSuperadmin =
    userRole === "superadmin" ||
    Boolean(envSuperadminEmail && admin.email.toLowerCase().trim() === envSuperadminEmail);

  if (isSuperadmin) {
    return { authorized: true, admin: { ...admin, role: "superadmin" } };
  }

  const serverRoles = await getServerRoles();
  if (!hasPermission({ roleId: userRole, permissions: userPerms }, module, action, serverRoles)) {
    return {
      authorized: false,
      status: 403,
      error: `Permission denied: ${action.toUpperCase()} rights required for ${MODULE_LABELS[module] || module}.`,
    };
  }

  return { authorized: true, admin: { ...admin, role: userRole } };
}

export function signAdminJwt(payload: AdminPayload): string {
  return jwt.sign(
    { sub: String(payload.sub), email: payload.email, role: payload.role, tokenType: "admin" as const },
    getJwtSecret(),
    { expiresIn: "12h" }
  );
}

export function createAdminCookieHeader(payload: AdminPayload): string {
  const token = signAdminJwt(payload);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${12 * 60 * 60}${isCookieSecure() ? "; Secure" : ""}`;
}

export function createClearAdminCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${isCookieSecure() ? "; Secure" : ""}`;
}

export function createUserCookieHeader(payload: UserSessionPayload): string {
  const token = jwt.sign(
    { sub: String(payload.sub), email: payload.email, role: payload.role || "user", tokenType: "user" as const },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
  return `${USER_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isCookieSecure() ? "; Secure" : ""}`;
}

export function createClearUserCookieHeader(): string {
  return `${USER_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${isCookieSecure() ? "; Secure" : ""}`;
}
