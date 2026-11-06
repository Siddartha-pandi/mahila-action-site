import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { queryDb } from "@/lib/db";
import { createAdminCookieHeader, getJwtSecret } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body || {};

    if (!email?.trim()) {
      return NextResponse.json({ ok: false, exists: false, error: "Email required." }, { status: 400 });
    }

    const result = await queryDb(
      "SELECT id, name, email, phone, role, kind, skills, permissions, status FROM users WHERE LOWER(email) = LOWER($1)",
      [String(email).toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ ok: false, exists: false, error: "Account deleted or no longer exists." }, { status: 404 });
    }

    const user = result.rows[0];
    const userRole = user.role || "user";
    const isActive = user.status === "Active" || !user.status;

    let adminJwt: string | undefined;
    let cookieHeader: string | undefined;

    // Issue/refresh admin JWT session if user holds an active administrative or staff role
    if (userRole !== "user" && isActive) {
      const adminPayload = { sub: String(user.id), email: user.email, role: userRole };
      cookieHeader = createAdminCookieHeader(adminPayload);
      adminJwt = jwt.sign(adminPayload, getJwtSecret(), { expiresIn: "12h" });
    }

    const res = NextResponse.json({
      ok: true,
      exists: true,
      jwt: adminJwt,
      profile: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: userRole,
        kind: user.kind,
        skills: user.skills || "",
        permissions: user.permissions || null,
        status: user.status || "Active",
      },
    });

    if (cookieHeader) {
      res.headers.set("Set-Cookie", cookieHeader);
    }

    return res;
  } catch (err: any) {
    console.error("Session verification error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
