import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { createAdminCookieHeader, createClearAdminCookieHeader, getUserSessionFromRequest, signAdminJwt } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/permissions";
import { getServerRoles } from "@/lib/rolesServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSessionFromRequest(req);
    if (!session?.email) {
      return NextResponse.json(
        { ok: false, exists: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const envSuperEmail = (process.env.SUPERADMIN_EMAIL || "").toLowerCase().trim();
    if (session.sub === "superadmin_env" && envSuperEmail && session.email.toLowerCase().trim() === envSuperEmail) {
      const adminPayload = { sub: "superadmin_env", email: envSuperEmail, role: "superadmin" };
      const adminJwt = signAdminJwt(adminPayload);
      const res = NextResponse.json({
        ok: true,
        exists: true,
        jwt: adminJwt,
        profile: {
          id: "superadmin_env",
          name: "Lead Super Admin",
          email: envSuperEmail,
          phone: "+91 XXXXXXXXXX",
          role: "superadmin",
          kind: "superadmin",
          skills: "Superadmin",
          permissions: null,
          status: "Active",
        },
      });
      res.headers.append("Set-Cookie", createAdminCookieHeader(adminPayload));
      return res;
    }

    const result = await queryDb(
      "SELECT id, name, email, phone, role, kind, skills, permissions, status FROM users WHERE LOWER(email) = LOWER($1)",
      [session.email.trim()],
      { noCache: true }
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ ok: false, exists: false, error: "Account deleted or no longer exists." }, { status: 404 });
    }

    const user = result.rows[0];
    const userRole = user.role || "user";
    const isActive = user.status === "Active" || !user.status;

    if (!isActive) {
      return NextResponse.json(
        { ok: false, exists: false, error: "This account has been deactivated." },
        { status: 403 }
      );
    }

    let adminJwt: string | undefined;
    let cookieHeader: string | undefined;
    let shouldClearAdminCookie = false;
    const serverRoles = await getServerRoles();

    // Only issue/refresh admin JWT session when the caller ALREADY proved identity via signed cookie/token
    if (canAccessAdminPanel({ role: userRole, permissions: user.permissions }, serverRoles)) {
      const adminPayload = { sub: String(user.id), email: user.email, role: userRole };
      cookieHeader = createAdminCookieHeader(adminPayload);
      adminJwt = signAdminJwt(adminPayload);
    } else {
      shouldClearAdminCookie = true;
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
      res.headers.append("Set-Cookie", cookieHeader);
    } else if (shouldClearAdminCookie) {
      res.headers.append("Set-Cookie", createClearAdminCookieHeader());
    }

    return res;
  } catch (err: any) {
    console.error("Session verification error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
