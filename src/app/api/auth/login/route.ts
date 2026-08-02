import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { queryDb } from "@/lib/db";
import { createAdminCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "mahilaaction.vsk@gmail.com").toLowerCase().trim();
    const envSuperadminPassword = (process.env.SUPERADMIN_PASSWORD || "1980Jan23").trim();

    // 1. Direct Environment-Variable Superadmin Check (Zero Database Storage Required)
    const isSuperadminInput =
      normalizedEmail === envSuperadminEmail ||
      normalizedEmail === "mahilaaction.vsk@gmail.com" ||
      normalizedEmail === "superadmin" ||
      normalizedEmail === "super admin";

    if (isSuperadminInput) {
      const inputPass = String(password).trim();
      let isValidSuperadmin = inputPass === envSuperadminPassword;

      if (!isValidSuperadmin && envSuperadminPassword.startsWith("$2")) {
        try {
          isValidSuperadmin = bcrypt.compareSync(inputPass, envSuperadminPassword);
        } catch {}
      }

      if (isValidSuperadmin) {
        const adminPayload = { sub: "superadmin_env", email: envSuperadminEmail, role: "superadmin" };
        const cookieHeader = createAdminCookieHeader(adminPayload);
        const token = jwt.sign(adminPayload, process.env.JWT_SECRET || "default_jwt_secret_dev_key", { expiresIn: "12h" });

        return NextResponse.json(
          { ok: true, email: envSuperadminEmail, jwt: token },
          { headers: { "Set-Cookie": cookieHeader } }
        );
      } else {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
    }

    // 2. Database Admin / Staff Accounts Check
    const result = await queryDb(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND role IN ('admin', 'staff')",
      [normalizedEmail]
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password, or user account does not have admin/staff access." }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const adminPayload = { sub: user.id, email: user.email, role: user.role };
    const cookieHeader = createAdminCookieHeader(adminPayload);
    const token = jwt.sign(adminPayload, process.env.JWT_SECRET || "default_jwt_secret_dev_key", { expiresIn: "12h" });

    return NextResponse.json(
      { ok: true, email: user.email, jwt: token },
      { headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
