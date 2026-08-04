import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { LIMITS, firstError, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, request_type, message } = body || {};

    const invalid = firstError(
      validateName(name),
      validateEmail(email),
      phone ? validatePhone(phone) : null,
      validateText(message, "your message", { max: LIMITS.message.max, required: false })
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const typeVal = request_type === "deactivate" ? "deactivate" : "activate";

    // perm_volunteer_requests.id is SERIAL — let the sequence assign it.
    const insertRes = await queryDb(
      `INSERT INTO perm_volunteer_requests (name, email, phone, request_type, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name.trim(), email.trim().toLowerCase(), phone || null, typeVal, message || null]
    );
    const id = insertRes.rows[0]?.id;

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/perm-volunteers error:", err);
    return NextResponse.json({ error: "Could not save request." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM perm_volunteer_requests ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/perm-volunteers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
