import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body || {};

    if (!email?.trim()) {
      return NextResponse.json({ ok: false, exists: false, error: "Email required." }, { status: 400 });
    }

    const result = await queryDb(
      "SELECT id, name, email, phone, role, kind, skills, status FROM users WHERE LOWER(email) = LOWER($1)",
      [String(email).toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ ok: false, exists: false, error: "Account deleted or no longer exists." }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      ok: true,
      exists: true,
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kind: user.kind,
        skills: user.skills || "",
      },
    });
  } catch (err: any) {
    console.error("Session verification error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
