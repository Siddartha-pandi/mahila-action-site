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
    const result = await queryDb("SELECT * FROM app_admin_users WHERE email = $1", [normalizedEmail]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const adminPayload = { sub: user.id, email: user.email };
    const cookieHeader = createAdminCookieHeader(adminPayload);
    const token = jwt.sign(adminPayload, process.env.JWT_SECRET || "default_jwt_secret_dev_key", { expiresIn: "12h" });

    return NextResponse.json(
      { ok: true, email: user.email, jwt: token },
      { headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
