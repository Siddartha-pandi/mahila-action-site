import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb(
      "SELECT id, name, email, phone, role, kind, skills, permissions, status, created_at FROM users ORDER BY created_at DESC"
    );
    const parsedRows = result.rows.map((row: any) => {
      let perms = row.permissions;
      if (typeof perms === "string" && perms.trim()) {
        try {
          perms = JSON.parse(perms);
        } catch {}
      }
      return { ...row, permissions: perms };
    });
    return NextResponse.json(parsedRows);
  } catch (err: any) {
    console.error("GET /api/members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, email, phone, role, kind, status, password, skills, permissions } = body || {};

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = phone ? String(phone).trim() : null;

    const existingRes = await queryDb(
      "SELECT email FROM users WHERE email = $1",
      [normalizedEmail]
    );
    if (existingRes.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }

    const id = nanoid();
    const password_hash = bcrypt.hashSync(String(password || "123456"), 10);
    const assignedRole = role || "user";
    const assignedStatus = status || "Active";
    const serializedPerms = permissions
      ? typeof permissions === "string"
        ? permissions
        : JSON.stringify(permissions)
      : null;

    await queryDb(
      `INSERT INTO users (id, name, email, phone, role, kind, password_hash, skills, permissions, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, name.trim(), normalizedEmail, normalizedPhone, assignedRole, kind || null, password_hash, skills || null, serializedPerms, assignedStatus]
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
