import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    const cookieHeader = createAdminCookieHeader({ sub: user.id, email: user.email });
    
    return NextResponse.json(
      { ok: true, email: user.email, jwt: "admin_authenticated" },
      { headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
