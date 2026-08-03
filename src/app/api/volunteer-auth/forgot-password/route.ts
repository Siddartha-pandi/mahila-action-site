import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { queryDb } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { validateEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body || {};
    const invalidEmail = validateEmail(email);
    if (invalidEmail) {
      return NextResponse.json({ error: invalidEmail }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const result = await queryDb("SELECT * FROM users WHERE email = $1 AND role = 'volunteer'", [normalizedEmail]);
    const user = result.rows[0];

    // Deliberate product decision: an unknown address is reported back to the
    // caller instead of the usual identical-response-either-way, so visitors are
    // told plainly that they have no account rather than waiting for an email
    // that will never arrive. The tradeoff is that this endpoint can be used to
    // test whether a given email is registered — do not add bulk lookups here,
    // and keep any rate limiting in front of it.
    if (!user) {
      return NextResponse.json(
        { error: "No account found for that email address." },
        { status: 404 }
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await queryDb(
      "UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3",
      [tokenHash, expires, user.id]
    );

    const origin = req.nextUrl.origin;
    const resetLink = `${origin}/?modal=volunteer&kind=reset&id=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
      return NextResponse.json(
        { error: "We couldn't send the reset email just now. Please try again in a few minutes." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "We've sent a link to reset your password.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
