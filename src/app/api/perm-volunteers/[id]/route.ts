import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { firstError, normalizePhone, validateEmail, validateName, validatePhone } from "@/lib/validation";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "submissions", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      return NextResponse.json({ error: "Permanent volunteer request not found" }, { status: 404 });
    }

    const res = await queryDb("SELECT * FROM perm_volunteer_requests WHERE id = $1", [numId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Permanent volunteer request not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/perm-volunteers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "submissions", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const { status, request_type, name, email, phone, message } = (await req.json()) || {};

    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    }

    const invalid = firstError(
      name !== undefined ? validateName(name) : null,
      email !== undefined ? validateEmail(email) : null,
      phone !== undefined ? validatePhone(phone, "phone number", { required: false }) : null
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (request_type !== undefined) {
      updates.push(`request_type = $${idx++}`);
      values.push(request_type);
    }
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(String(name).trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(String(email).trim().toLowerCase());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone ? normalizePhone(phone) : null);
    }
    if (message !== undefined) {
      updates.push(`message = $${idx++}`);
      values.push(String(message).trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(numId);
    const res = await queryDb(`UPDATE perm_volunteer_requests SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Permanent volunteer request not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, request: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/perm-volunteers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "submissions", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const res = await queryDb("DELETE FROM perm_volunteer_requests WHERE id = $1 RETURNING id", [numId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Permanent volunteer request not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: numId });
  } catch (err: any) {
    console.error("DELETE /api/perm-volunteers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
