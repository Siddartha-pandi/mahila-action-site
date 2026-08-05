import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const res = await queryDb("SELECT * FROM contact_submissions WHERE id = $1", [params.id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Contact submission not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/contact/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { status, name, email, phone, subject, message } = (await req.json()) || {};

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
    if (subject !== undefined) {
      updates.push(`subject = $${idx++}`);
      values.push(String(subject).trim());
    }
    if (message !== undefined) {
      updates.push(`message = $${idx++}`);
      values.push(String(message).trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(params.id);
    const res = await queryDb(`UPDATE contact_submissions SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return NextResponse.json({ ok: true, submission: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/contact/[id] error:", err);
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
    await queryDb("DELETE FROM contact_submissions WHERE id = $1", [params.id]);
    return NextResponse.json({ ok: true, id: params.id });
  } catch (err: any) {
    console.error("DELETE /api/contact/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
