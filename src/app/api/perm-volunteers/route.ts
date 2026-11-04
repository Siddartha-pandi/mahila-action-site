import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest, verifyAdminPermission } from "@/lib/auth";
import { sendPermVolunteerAcknowledgementEmail, sendPermVolunteerAlertToAdmin } from "@/lib/email";
import { LIMITS, firstError, normalizePhone, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, request_type, message } = body || {};

    const invalid = firstError(
      validateName(name),
      validateEmail(email),
      validatePhone(phone, "phone number", { required: false }),
      validateText(message, "your message", { max: LIMITS.message.max, required: false })
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const typeVal = request_type === "deactivate" ? "deactivate" : "activate";
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? normalizePhone(phone) : null;
    const cleanName = name.trim();
    const cleanMessage = message ? String(message).trim() : null;

    // Prevent duplicate pending requests under review
    const existing = await queryDb(
      "SELECT id FROM perm_volunteer_requests WHERE LOWER(email) = LOWER($1) AND request_type = $2 AND status = 'New'",
      [cleanEmail, typeVal]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({
        ok: true,
        id: existing.rows[0].id,
        alreadyPending: true,
        message: "Your request is already submitted and under review."
      }, { status: 200 });
    }

    // perm_volunteer_requests.id is SERIAL — let the sequence assign it.
    const insertRes = await queryDb(
      `INSERT INTO perm_volunteer_requests (name, email, phone, request_type, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [cleanName, cleanEmail, cleanPhone, typeVal, cleanMessage]
    );
    const id = insertRes.rows[0]?.id;

    sendPermVolunteerAcknowledgementEmail(cleanEmail, cleanName, typeVal).catch((err) =>
      console.error("sendPermVolunteerAcknowledgementEmail failed:", err)
    );

    sendPermVolunteerAlertToAdmin({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      requestType: typeVal,
      message: cleanMessage,
    }).catch((err) => console.error("sendPermVolunteerAlertToAdmin failed:", err));

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/perm-volunteers error:", err);
    return NextResponse.json({ error: "Could not save request." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "submissions", "view");
  if (!auth.authorized) {
    const admin = await getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: auth.error || "Not authenticated" }, { status: auth.status || 401 });
  }

  try {
    const result = await queryDb("SELECT * FROM perm_volunteer_requests ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/perm-volunteers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
