import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

// Review status only. There is deliberately no DELETE here: a member row is a
// real sign-in account, and removing one while tidying the submissions list
// would lock that person out of the site.
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
