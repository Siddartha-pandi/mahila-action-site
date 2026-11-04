import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { firstError, normalizePhone, validateEmail, validateName, validatePassword, validatePhone } from "@/lib/validation";
import { sendMemberWelcomeEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "roles", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await queryDb(
      "SELECT id, name, email, phone, role, kind, skills, permissions, status, created_at FROM users ORDER BY created_at DESC"
    );
    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "mahilaaction.vsk@gmail.com").toLowerCase().trim();
    const virtualSuperadmin = {
      id: "superadmin_env",
      name: "Lead Super Admin",
      email: envSuperadminEmail,
      phone: "+91 XXXXXXXXXX",
      role: "superadmin",
      kind: "superadmin",
      skills: null,
      permissions: null,
      status: "Active",
      created_at: new Date().toISOString(),
    };

    const parsedRows = [
      virtualSuperadmin,
      ...result.rows.map((row: any) => {
        let perms = row.permissions;
        if (typeof perms === "string" && perms.trim()) {
          try {
            perms = JSON.parse(perms);
          } catch {}
        }
        return { ...row, permissions: perms };
      }),
    ];
    return NextResponse.json(parsedRows);
  } catch (err: any) {
    console.error("GET /api/members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "roles", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, email, phone, role, kind, status, password, skills, permissions } = body || {};

    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "mahilaaction.vsk@gmail.com").toLowerCase().trim();
    const isSuperadmin =
      auth.admin?.role === "superadmin" ||
      auth.admin?.sub === "superadmin_env" ||
      auth.admin?.email.toLowerCase().trim() === envSuperadminEmail;

    if (role === "superadmin" && !isSuperadmin) {
      return NextResponse.json({ error: "Only a Super Admin can create Super Admin accounts." }, { status: 403 });
    }

    const invalid = firstError(
      validateName(name),
      validateEmail(email),
      validatePhone(phone, "phone number", { required: false }),
      // Admins may leave the password blank to accept the default below; only a
      // supplied one has to meet the strength rules.
      password && String(password).trim() ? validatePassword(password) : null
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    const existingRes = await queryDb(
      "SELECT email FROM users WHERE email = $1",
      [normalizedEmail]
    );
    if (existingRes.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }

    const rawPassword = password && String(password).trim() ? String(password) : "Mahila@2026";
    const password_hash = bcrypt.hashSync(rawPassword, 10);
    const assignedRole = role || "user";
    const assignedStatus = status || "Active";
    const serializedPerms = permissions
      ? typeof permissions === "string"
        ? permissions
        : JSON.stringify(permissions)
      : null;

    // users.id is SERIAL — let the sequence assign it.
    const insertRes = await queryDb(
      `INSERT INTO users (name, email, phone, role, kind, password_hash, skills, permissions, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [name.trim(), normalizedEmail, normalizedPhone, assignedRole, kind || null, password_hash, skills || null, serializedPerms, assignedStatus]
    );
    const id = insertRes.rows[0]?.id;

    sendMemberWelcomeEmail(normalizedEmail, name.trim(), assignedRole, rawPassword).catch((err) =>
      console.error("sendMemberWelcomeEmail failed:", err)
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (String(err.message).includes("unique") || String(err.message).includes("UNIQUE")) {
      return NextResponse.json({ error: "An account with this email is already registered." }, { status: 409 });
    }
    console.error("POST /api/members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
