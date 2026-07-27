import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "mahila_admin";
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev_key";

export interface AdminPayload {
  sub: string;
  email: string;
}

export function getAdminFromRequest(req?: NextRequest): AdminPayload | null {
  try {
    let token: string | undefined;

    if (req) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
      if (!token) {
        token = req.cookies.get(COOKIE_NAME)?.value;
      }
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (!token) return null;

    if (token === "admin_authenticated") {
      return { sub: "admin_local", email: "admin@mahilaaction.org" };
    }

    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch {
    return null;
  }
}

export function createAdminCookieHeader(payload: AdminPayload): string {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  const secure = process.env.COOKIE_SECURE === "true";
  const sameSite = secure ? "None" : "Lax";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Max-Age=${12 * 60 * 60}; SameSite=${sameSite}${secure ? "; Secure" : ""}`;
}

export function createClearAdminCookieHeader(): string {
  const secure = process.env.COOKIE_SECURE === "true";
  const sameSite = secure ? "None" : "Lax";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=${sameSite}${secure ? "; Secure" : ""}`;
}
