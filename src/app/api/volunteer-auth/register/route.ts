import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryDb } from "@/lib/db";
import { createUserCookieHeader } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { firstError, normalizePhone, validateEmail, validateName, validatePassword, validatePhone } from "@/lib/validation";

function toProfile(row: any) {
  return { name: row.name, email: row.email, phone: row.phone, skills: row.skills || "" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password, skills } = body || {};

    const invalid = firstError(
      validateName(name),
      validateEmail(email),
      validatePhone(phone),
      validatePassword(password)
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = normalizePhone(phone);

    const existingRes = await queryDb(
      "SELECT email, phone FROM users WHERE email = $1 OR phone = $2",
      [normalizedEmail, normalizedPhone]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const field = existing.email === normalizedEmail ? "email address" : "phone number";
      return NextResponse.json({
        error: `An account with this ${field} is already registered. Please sign in instead.`,
      }, { status: 409 });
    }

    const password_hash = bcrypt.hashSync(String(password), 10);
    const insertRes = await queryDb(
      `INSERT INTO users (name, email, phone, role, status, password_hash, skills) VALUES ($1, $2, $3, 'user', 'Active', $4, $5) RETURNING id`,
      [name.trim(), normalizedEmail, normalizedPhone, password_hash, skills || null]
    );
    const insertedId = insertRes.rows[0]?.id;

    // Fire-and-forget: a mail failure must not fail an account that was created.
    sendWelcomeEmail(normalizedEmail, name.trim()).catch((err) =>
      console.error("sendWelcomeEmail failed:", err)
    );

    const userId = insertedId ? String(insertedId) : "";
    const res = NextResponse.json({
      ok: true,
      id: userId || undefined,
      profile: {
        id: userId || undefined,
        ...toProfile({ name: name.trim(), email: normalizedEmail, phone: normalizedPhone, skills }),
        role: "user",
        status: "Active",
      },
    }, { status: 201 });
    res.headers.append(
      "Set-Cookie",
      createUserCookieHeader({ sub: userId || normalizedEmail, email: normalizedEmail, role: "user" })
    );
    return res;
  } catch (err: any) {
    if (String(err.message).includes("unique") || String(err.message).includes("UNIQUE")) {
      return NextResponse.json({ error: "An account with this email or phone number is already registered." }, { status: 409 });
    }
    console.error("Volunteer register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
