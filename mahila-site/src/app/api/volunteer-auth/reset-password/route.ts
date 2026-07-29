import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { queryDb } from "@/lib/db";
import { sendPasswordChangedEmail } from "@/lib/email";

function toProfile(row: any) {
  return { name: row.name, email: row.email, phone: row.phone, skills: row.skills || "" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body || {};
    if (!token || !password) {
      return NextResponse.json({ error: "Reset token and new password are required." }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const result = await queryDb("SELECT * FROM volunteer_accounts WHERE reset_token_hash = $1", [tokenHash]);
    const user = result.rows[0];

    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    const password_hash = bcrypt.hashSync(String(password), 10);
    await queryDb(
      "UPDATE volunteer_accounts SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2",
      [password_hash, user.id]
    );

    sendPasswordChangedEmail(user.email).catch((err) =>
      console.error("sendPasswordChangedEmail failed:", err)
    );

    return NextResponse.json({ ok: true, profile: toProfile({ ...user, password_hash: undefined }) });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
