import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryDb } from "@/lib/db";
import { createAdminCookieHeader, createUserCookieHeader, signAdminJwt } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/permissions";
import { getServerRoles } from "@/lib/rolesServer";

function toProfile(row: any) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    skills: row.skills || "",
    role: row.role || "user",
    permissions: row.permissions || null,
    status: row.status || "Active",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "").toLowerCase().trim();
    const envSuperadminPassword = (process.env.SUPERADMIN_PASSWORD || "").trim();

    // Direct Environment Superadmin Match
    const isSuperadminInput =
      Boolean(envSuperadminEmail && normalizedEmail === envSuperadminEmail) ||
      normalizedEmail === "superadmin" ||
      normalizedEmail === "super admin";

    if (isSuperadminInput && envSuperadminPassword) {
      const inputPass = String(password).trim();
      let isValidSuperadmin = inputPass === envSuperadminPassword;
      if (!isValidSuperadmin && envSuperadminPassword.startsWith("$2")) {
        try {
          isValidSuperadmin = bcrypt.compareSync(inputPass, envSuperadminPassword);
        } catch {}
      }

      if (isValidSuperadmin) {
        const adminPayload = { sub: "superadmin_env", email: envSuperadminEmail, role: "superadmin" };
        const token = signAdminJwt(adminPayload);

        const res = NextResponse.json({
          ok: true,
          jwt: token,
          profile: {
            id: "superadmin_env",
            name: "Lead Super Admin",
            email: envSuperadminEmail,
            phone: "+91 XXXXXXXXXX",
            skills: "Superadmin",
            role: "superadmin",
            permissions: null,
            status: "Active",
          },
        });
        res.headers.append("Set-Cookie", createAdminCookieHeader(adminPayload));
        res.headers.append("Set-Cookie", createUserCookieHeader(adminPayload));
        return res;
      } else {
        return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
      }
    }

    const result = await queryDb("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [
      normalizedEmail,
    ], { noCache: true });
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const userRole = user.role || "user";
    const isActive = user.status === "Active" || !user.status;
    if (!isActive) {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact the administrator." },
        { status: 403 }
      );
    }

    const serverRoles = await getServerRoles();
    let adminJwt: string | undefined;
    let adminCookieHeader: string | undefined;

    if (canAccessAdminPanel({ role: userRole, permissions: user.permissions }, serverRoles)) {
      const adminPayload = { sub: String(user.id), email: user.email, role: userRole };
      adminCookieHeader = createAdminCookieHeader(adminPayload);
      adminJwt = signAdminJwt(adminPayload);
    }

    const userCookieHeader = createUserCookieHeader({
      sub: String(user.id),
      email: user.email,
      role: userRole,
    });

    const res = NextResponse.json({
      ok: true,
      jwt: adminJwt,
      profile: toProfile(user),
    });

    res.headers.append("Set-Cookie", userCookieHeader);
    if (adminCookieHeader) {
      res.headers.append("Set-Cookie", adminCookieHeader);
    }

    return res;
  } catch (err: any) {
    console.error("Volunteer login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
