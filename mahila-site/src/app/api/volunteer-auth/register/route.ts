import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { isValidPhoneNumber } from "@/lib/validation";

function toProfile(row: any) {
  return { name: row.name, email: row.email, phone: row.phone, skills: row.skills || "" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password, skills } = body || {};

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return NextResponse.json({ error: "Name, email, phone, and password are required." }, { status: 400 });
    }
    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

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

    const id = nanoid();
    const password_hash = bcrypt.hashSync(String(password), 10);
    await queryDb(
      `INSERT INTO users (id, name, email, phone, role, password_hash, skills) VALUES ($1, $2, $3, $4, 'user', $5, $6)`,
      [id, name.trim(), normalizedEmail, normalizedPhone, password_hash, skills || null]
    );

    // Fire-and-forget: a mail failure must not fail an account that was created.
    sendWelcomeEmail(normalizedEmail, name.trim()).catch((err) =>
      console.error("sendWelcomeEmail failed:", err)
    );

    return NextResponse.json({
      ok: true,
      profile: toProfile({ name: name.trim(), email: normalizedEmail, phone: normalizedPhone, skills }),
    }, { status: 201 });
  } catch (err: any) {
    if (String(err.message).includes("unique") || String(err.message).includes("UNIQUE")) {
      return NextResponse.json({ error: "An account with this email or phone number is already registered." }, { status: 409 });
    }
    console.error("Volunteer register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
