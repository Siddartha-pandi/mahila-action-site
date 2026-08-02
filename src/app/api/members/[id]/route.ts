import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (params.id === "superadmin_env") {
    const envSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "mahilaaction.vsk@gmail.com").toLowerCase().trim();
    return NextResponse.json({
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
    });
  }

  try {
    const res = await queryDb("SELECT id, name, email, phone, role, kind, skills, permissions, status, created_at FROM users WHERE id = $1", [params.id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/members/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { role, kind, sub_role, status, name, email, phone, skills, permissions } = body || {};

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    const kindVal = kind !== undefined ? kind : sub_role;
    if (kindVal !== undefined) {
      updates.push(`kind = $${idx++}`);
      values.push(kindVal);
    }
    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(email.toLowerCase().trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone.trim());
    }
    if (skills !== undefined) {
      updates.push(`skills = $${idx++}`);
      values.push(skills);
    }
    if (permissions !== undefined) {
      const serializedPerms = permissions === null
        ? null
        : typeof permissions === "string"
        ? permissions
        : JSON.stringify(permissions);
      updates.push(`permissions = $${idx++}`);
      values.push(serializedPerms);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(params.id);
    await queryDb(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, values);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/members/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const checkRes = await queryDb("SELECT role FROM users WHERE id = $1", [params.id]);
    if (checkRes.rows[0]?.role === "superadmin") {
      return NextResponse.json({ error: "Superadmin account cannot be deleted." }, { status: 403 });
    }
    await queryDb("DELETE FROM users WHERE id = $1", [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/members/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
