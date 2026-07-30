import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { isValidPhoneNumber } from "@/lib/validation";
import { sendVendorConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requiredFields = ["business_name", "contact_name", "email", "phone", "offering", "event_name"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }
    if (body.phone && !isValidPhoneNumber(String(body.phone))) {
      return NextResponse.json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." }, { status: 400 });
    }

    // One stall application per business per event — repeat submissions used to
    // pile up as separate applications for the admin team to sift through.
    const duplicate = await queryDb(
      "SELECT id FROM vendor_registrations WHERE LOWER(email) = LOWER($1) AND LOWER(event_name) = LOWER($2) LIMIT 1",
      [String(body.email).trim(), String(body.event_name).trim()]
    );
    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { error: `You've already applied to be a vendor at ${body.event_name}. We'll be in touch about that application.` },
        { status: 409 }
      );
    }

    const id = nanoid();
    await queryDb(
      `INSERT INTO vendor_registrations (id, event_name, business_name, contact_name, email, phone, offering, needs_space)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        body.event_name,
        body.business_name,
        body.contact_name,
        body.email,
        body.phone,
        body.offering,
        body.needs_space ? 1 : 0,
      ]
    );

    sendVendorConfirmationEmail(body.email, body.contact_name, body.business_name, body.event_name).catch((err) =>
      console.error("sendVendorConfirmationEmail failed:", err)
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/vendors error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM vendor_registrations ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/vendors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
