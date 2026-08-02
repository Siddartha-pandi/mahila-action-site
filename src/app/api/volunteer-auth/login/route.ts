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

    const normalizedEmail = String(email).toLowerCase().trim();
    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "mahilaaction.vsk@gmail.com").toLowerCase().trim();
    const envSuperadminPassword = (process.env.SUPERADMIN_PASSWORD || "1980Jan23").trim();

    // Direct Environment Superadmin Match
    const isSuperadminInput =
      normalizedEmail === envSuperadminEmail ||
      normalizedEmail === "mahilaaction.vsk@gmail.com" ||
      normalizedEmail === "superadmin" ||
      normalizedEmail === "super admin";

    if (isSuperadminInput) {
      const inputPass = String(password).trim();
      let isValidSuperadmin = inputPass === envSuperadminPassword;
      if (!isValidSuperadmin && envSuperadminPassword.startsWith("$2")) {
        try {
          isValidSuperadmin = bcrypt.compareSync(inputPass, envSuperadminPassword);
        } catch {}
      }

      if (isValidSuperadmin) {
        return NextResponse.json({
          ok: true,
          profile: {
            name: "Lead Super Admin",
            email: envSuperadminEmail,
            phone: "+91 XXXXXXXXXX",
            skills: "Superadmin",
          },
        });
      } else {
        return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
      }
    }

    const result = await queryDb("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [
      normalizedEmail,
    ]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    return NextResponse.json({ ok: true, profile: toProfile(user) });
  } catch (err: any) {
    console.error("Volunteer login error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
