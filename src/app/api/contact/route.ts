import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sendContactAcknowledgementEmail } from "@/lib/email";
import { LIMITS, firstError, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invalid = firstError(
      validateName(body.name),
      validateEmail(body.email),
      // Phone is optional on the contact form, but must be sane when supplied.
      body.phone ? validatePhone(body.phone) : null,
      validateText(body.subject, "a subject", { max: LIMITS.subject.max, required: false }),
      validateText(body.message, "your message", { min: LIMITS.message.min, max: LIMITS.message.max })
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // contact_submissions.id is SERIAL — let the sequence assign it.
    const insertRes = await queryDb(
      `INSERT INTO contact_submissions (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        body.name,
        body.email,
        body.phone || null,
        body.subject || null,
        body.message,
      ]
    );
    const id = insertRes.rows[0]?.id;

    sendContactAcknowledgementEmail(body.email, body.name, body.subject || undefined).catch((err) =>
      console.error("sendContactAcknowledgementEmail failed:", err)
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/contact error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM contact_submissions ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/contact error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
