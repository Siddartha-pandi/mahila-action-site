import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryDb } from "@/lib/db";
import { createAdminCookieHeader, createUserCookieHeader, signAdminJwt } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/permissions";
import { getServerRoles } from "@/lib/rolesServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "").toLowerCase().trim();
    const envSuperadminPassword = (process.env.SUPERADMIN_PASSWORD || "").trim();

    // 1. Direct Environment-Variable Superadmin Check (Zero Database Storage Required)
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
        const adminPayload = { sub: "superadmin_env", email: envSuperadminEmail || "superadmin", role: "superadmin" };
        const token = signAdminJwt(adminPayload);
        const res = NextResponse.json({
          ok: true,
          email: envSuperadminEmail || "superadmin",
          role: "superadmin",
          jwt: token,
          profile: {
            id: "superadmin_env",
            name: "Lead Super Admin",
            email: envSuperadminEmail || "superadmin",
            phone: "",
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
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
    }

    // 2. Database Admin / Staff / Custom Role / Permitted User Accounts Check
    const result = await queryDb(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );
    const user = result.rows[0];

    const serverRoles = await getServerRoles();
    if (!user || !canAccessAdminPanel({ role: user.role, permissions: user.permissions }, serverRoles)) {
      return NextResponse.json({ error: "Invalid email or password, or user account does not have admin panel access." }, { status: 401 });
    }

    if (user.status && user.status !== "Active") {
      return NextResponse.json({ error: "Your account is inactive. Please contact the administrator." }, { status: 403 });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const adminPayload = { sub: String(user.id), email: user.email, role: user.role || "user" };
    const token = signAdminJwt(adminPayload);
    const res = NextResponse.json({
      ok: true,
      email: user.email,
      role: user.role || "user",
      jwt: token,
      profile: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        skills: user.skills || "",
        role: user.role || "user",
        permissions: user.permissions ?? null,
        status: user.status || "Active",
      },
    });
    res.headers.append("Set-Cookie", createAdminCookieHeader(adminPayload));
    res.headers.append("Set-Cookie", createUserCookieHeader(adminPayload));
    return res;
  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Invalid credentials or login failed." }, { status: 500 });
  }
}
