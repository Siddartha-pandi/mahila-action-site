import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryDb } from "@/lib/db";

function toProfile(row: any) {
  return { name: row.name, email: row.email, phone: row.phone, skills: row.skills || "" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const result = await queryDb("SELECT * FROM users WHERE email = $1 AND role = 'volunteer'", [
      String(email).toLowerCase().trim(),
    ]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    return NextResponse.json({ ok: true, profile: toProfile(user) });
  } catch (err: any) {
    console.error("Volunteer login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
