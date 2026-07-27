import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { queryDb } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body || {};
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const result = await queryDb("SELECT * FROM volunteer_accounts WHERE email = $1", [normalizedEmail]);
    const user = result.rows[0];

    const genericResponse = {
      ok: true,
      message: "If an account exists for that email, we've sent password reset instructions.",
    };

    if (!user) return NextResponse.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await queryDb(
      "UPDATE volunteer_accounts SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3",
      [tokenHash, expires, user.id]
    );

    const origin = req.nextUrl.origin;
    const resetLink = `${origin}/?modal=volunteer&kind=reset&id=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }

    return NextResponse.json(genericResponse);
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
