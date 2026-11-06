import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { queryDb } from "./db";
import { AdminModule, PermissionAction, MODULE_LABELS, hasPermission } from "./permissions";
import { auth as authJsSession } from "@/auth";

const COOKIE_NAME = "mahila_admin";

/**
 * Retrieves the cryptographic secret used for JWT signing and verification.
 * In production, an explicitly configured JWT_SECRET or AUTH_SECRET is mandatory.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET or AUTH_SECRET environment variable is required in production."
      );
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
}

export interface AdminAuthResult {
  authorized: boolean;
  admin?: AdminPayload;
  status?: number;
  error?: string;
}

export async function getAdminFromRequest(req?: NextRequest): Promise<AdminPayload | null> {
  // Check Auth.js session first
  try {
    const authSession = await authJsSession();
    if (authSession?.user?.email) {
      return {
        sub: (authSession.user as any).id || authSession.user.email,
        email: authSession.user.email,
        role: (authSession.user as any).role || "admin",
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

  // Every candidate must survive signature verification.
  for (const token of candidates) {
    if (!token || token === "session" || token === "admin_authenticated") {
      continue;
    }
    try {
      return jwt.verify(token, secret) as AdminPayload;
    } catch {
      // try the next candidate
    }
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
  const isSuperadmin =
    admin.role === "superadmin" ||
    admin.sub === "superadmin_env" ||
    Boolean(envSuperadminEmail && admin.email.toLowerCase().trim() === envSuperadminEmail);

  if (isSuperadmin) {
    return { authorized: true, admin: { ...admin, role: "superadmin" } };
  }

  let userRole = admin.role || "user";
  let userPerms: any = null;

  if (admin.sub && /^\d+$/.test(String(admin.sub))) {
    try {
      const userRes = await queryDb("SELECT role, permissions, status FROM users WHERE id = $1", [admin.sub]);
      if (userRes.rows.length > 0) {
        const row = userRes.rows[0];
        if (row.status && row.status !== "Active") {
          return { authorized: false, status: 403, error: "Account is inactive." };
        }
        userRole = row.role || userRole;
        userPerms = row.permissions;
      }
    } catch {}
  }

  if (!hasPermission({ roleId: userRole, permissions: userPerms }, module, action)) {
    return {
      authorized: false,
      status: 403,
      error: `Permission denied: ${action.toUpperCase()} rights required for ${MODULE_LABELS[module] || module}.`,
    };
  }

  return { authorized: true, admin: { ...admin, role: userRole } };
}

export function createAdminCookieHeader(payload: AdminPayload): string {
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "12h" });
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    (process.env.FRONTEND_URL?.startsWith("https://") ?? false);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}

export function createClearAdminCookieHeader(): string {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    (process.env.FRONTEND_URL?.startsWith("https://") ?? false);
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}
