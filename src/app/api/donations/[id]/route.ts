import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import {
  firstError,
  validateAmount,
  validateEmail,
  validateName,
  normalizePhone,
  validatePhone,
  validatePanNumber,
  validateAddress,
} from "@/lib/validation";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed", "Rejected"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "donations", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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
  const auth = await verifyAdminPermission(req, "donations", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const {
      status,
      amount,
      name,
      email,
      phone,
      donation_type,
      pan_number,
      address,
      payment_method,
      transaction_id,
      receipt_number,
      notes,
    } = (await req.json()) || {};

    const invalid = firstError(
      amount !== undefined ? validateAmount(amount) : null,
      name !== undefined ? validateName(name, "donor name", { required: false }) : null,
      email !== undefined ? validateEmail(email, "donor email", { required: false }) : null,
      phone !== undefined ? validatePhone(phone, "phone number", { required: false }) : null,
      pan_number !== undefined ? validatePanNumber(pan_number, false) : null,
      address !== undefined ? validateAddress(address, false) : null
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
      values.push(phone ? normalizePhone(phone) : null);
    }
    if (donation_type !== undefined) {
      updates.push(`donation_type = $${idx++}`);
      values.push(String(donation_type).trim());
    }
    if (pan_number !== undefined) {
      updates.push(`pan_number = $${idx++}`);
      values.push(pan_number ? String(pan_number).trim().toUpperCase() : null);
    }
    if (address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(address ? String(address).trim() : null);
    }
    if (payment_method !== undefined) {
      updates.push(`payment_method = $${idx++}`);
      values.push(String(payment_method).trim().toLowerCase());
    }
    if (transaction_id !== undefined) {
      updates.push(`transaction_id = $${idx++}`);
      values.push(transaction_id ? String(transaction_id).trim() : null);
    }
    if (receipt_number !== undefined) {
      updates.push(`receipt_number = $${idx++}`);
      values.push(receipt_number ? String(receipt_number).trim() : null);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes ? String(notes).trim() : null);
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
  const auth = await verifyAdminPermission(req, "donations", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    await queryDb("DELETE FROM donations WHERE id = $1", [id]);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/donations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
