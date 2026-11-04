import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { LIMITS, firstError, normalizePhone, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "submissions", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM contact_submissions WHERE id = $1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Contact submission not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/contact/[id] error:", err);
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
    const { status, name, email, phone, subject, message } = (await req.json()) || {};

    const invalid = firstError(
      name !== undefined ? validateName(name) : null,
      email !== undefined ? validateEmail(email) : null,
      phone !== undefined ? validatePhone(phone, "phone number", { required: false }) : null,
      subject !== undefined ? validateText(subject, "subject", { max: LIMITS.subject.max, required: false }) : null,
      message !== undefined ? validateText(message, "message", { min: LIMITS.message.min, max: LIMITS.message.max }) : null
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

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
      values.push(phone ? normalizePhone(phone) : null);
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

    values.push(id);
    const res = await queryDb(`UPDATE contact_submissions SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return NextResponse.json({ ok: true, submission: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/contact/[id] error:", err);
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
    await queryDb("DELETE FROM contact_submissions WHERE id = $1", [id]);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/contact/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
