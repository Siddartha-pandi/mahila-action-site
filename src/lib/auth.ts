import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { queryDb } from "./db";
import { AdminModule, PermissionAction, MODULE_LABELS, hasPermission } from "./permissions";

const COOKIE_NAME = "mahila_admin";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev_key";

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

  // Every candidate must survive signature verification.
  for (const token of candidates) {
    if (!token || token === "session" || token === "admin_authenticated") {
      continue;
    }
    try {
      return jwt.verify(token, JWT_SECRET) as AdminPayload;
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

  const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "mahilaaction.vsk@gmail.com").toLowerCase().trim();
  const isSuperadmin =
    admin.role === "superadmin" ||
    admin.sub === "superadmin_env" ||
    admin.email.toLowerCase().trim() === envSuperadminEmail;

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
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  const isProduction = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}

export function createClearAdminCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}
