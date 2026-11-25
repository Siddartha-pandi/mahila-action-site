import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { queryDb } from "@/lib/db";
import { createAdminCookieHeader, createUserCookieHeader } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/permissions";
import { getServerRoles } from "@/lib/rolesServer";
import { sendPasswordChangedEmail } from "@/lib/email";
import { validatePassword } from "@/lib/validation";

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
    const { token, password } = body || {};
    if (!token || !password) {
      return NextResponse.json({ error: "Reset token and new password are required." }, { status: 400 });
    }
    const weak = validatePassword(password, "New password");
    if (weak) {
      return NextResponse.json({ error: weak }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const result = await queryDb("SELECT * FROM users WHERE reset_token_hash = $1", [tokenHash], { noCache: true });
    const user = result.rows[0];

    const expiryTime = user?.reset_token_expires ? new Date(user.reset_token_expires).getTime() : 0;
    if (!user || !user.reset_token_expires || isNaN(expiryTime) || expiryTime < Date.now()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    if (user.status && user.status !== "Active") {
      return NextResponse.json({ error: "This account is inactive. Please contact the administrator." }, { status: 403 });
    }

    const password_hash = bcrypt.hashSync(String(password), 10);
    await queryDb(
      "UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2",
      [password_hash, user.id]
    );

    sendPasswordChangedEmail(user.email).catch((err) =>
      console.error("sendPasswordChangedEmail failed:", err)
    );

    const res = NextResponse.json({ ok: true, profile: toProfile({ ...user, password_hash: undefined }) });
    res.headers.append(
      "Set-Cookie",
      createUserCookieHeader({ sub: String(user.id), email: user.email, role: user.role || "user" })
    );
    const serverRoles = await getServerRoles();
    if (canAccessAdminPanel({ role: user.role, permissions: user.permissions }, serverRoles)) {
      res.headers.append(
        "Set-Cookie",
        createAdminCookieHeader({ sub: String(user.id), email: user.email, role: user.role || "admin" })
      );
    }
    return res;
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

