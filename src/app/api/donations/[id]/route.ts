import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM donations WHERE id = $1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Donation record not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/donations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { status, amount, name, email, phone, donation_type } = (await req.json()) || {};

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
    if (amount !== undefined) {
      updates.push(`amount = $${idx++}`);
      values.push(Number(amount) || 0);
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
    if (donation_type !== undefined) {
      updates.push(`donation_type = $${idx++}`);
      values.push(String(donation_type).trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(id);
    const res = await queryDb(`UPDATE donations SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return NextResponse.json({ ok: true, donation: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/donations/[id] error:", err);
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
    await queryDb("DELETE FROM donations WHERE id = $1", [id]);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/donations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
