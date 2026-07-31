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
      const cookieToken = cookies().get(COOKIE_NAME)?.value;
      if (cookieToken) candidates.push(cookieToken);
    }
  } catch {
    return null;
  }

  // Every candidate must survive signature verification. There used to be a
  // shortcut here accepting the literal string "admin_authenticated", which let
  // anyone read submissions and edit content by sending that one header value.
  // The client stores a non-secret flag under the same name, so an unverifiable
  // bearer token falls through to the cookie rather than failing the request.
  for (const token of candidates) {
    try {
      return jwt.verify(token, JWT_SECRET) as AdminPayload;
    } catch {
      // try the next candidate
    }
  }

  return null;
}

export function createAdminCookieHeader(payload: AdminPayload): string {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  const isProduction = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Max-Age=${12 * 60 * 60}; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}

export function createClearAdminCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`;
}
