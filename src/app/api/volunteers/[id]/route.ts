import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM event_reservations WHERE id = $1 AND volunteer_commitment IS NOT NULL", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Volunteer record not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/volunteers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { status, name, email, phone, volunteer_commitment } = (await req.json()) || {};

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Unknown status." }, { status: 400 });
      }
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(String(name).trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(String(email).trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(String(phone).trim());
    }
    if (volunteer_commitment !== undefined) {
      updates.push(`volunteer_commitment = $${idx++}`);
      values.push(String(volunteer_commitment).trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(id);
    const res = await queryDb(`UPDATE event_reservations SET ${updates.join(", ")} WHERE id = $${idx} AND volunteer_commitment IS NOT NULL RETURNING *`, values);
    return NextResponse.json({ ok: true, volunteer: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/volunteers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    await queryDb("DELETE FROM event_reservations WHERE id = $1 AND volunteer_commitment IS NOT NULL", [id]);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/volunteers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
