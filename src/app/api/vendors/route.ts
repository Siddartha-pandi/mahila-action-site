import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { firstError, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";
import { sendVendorConfirmationEmail, sendVendorAlertToAdmin } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invalid = firstError(
      // A business name may legitimately contain digits and symbols ("Café 24"),
      // so it is length-checked rather than run through the person-name rule.
      validateText(body.business_name, "your business name", { min: 2, max: 150 }),
      validateName(body.contact_name, "contact name"),
      validateEmail(body.email),
      validatePhone(body.phone),
      validateText(body.offering, "what you will be offering", { min: 3, max: 500 }),
      validateText(body.event_name, "the event name", { max: 200 })
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const duplicate = await queryDb(
      "SELECT id FROM event_reservations WHERE LOWER(email) = LOWER($1) AND LOWER(event_name) = LOWER($2) AND volunteer_commitment = 'vendor' LIMIT 1",
      [String(body.email).trim(), String(body.event_name).trim()]
    );
    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { error: `You've already applied to be a vendor at ${body.event_name}. We'll be in touch about that application.` },
        { status: 409 }
      );
    }

    const vendorMeta = [
      {
        business_name: body.business_name,
        offering: body.offering,
        needs_space: body.needs_space ? 1 : 0,
      },
    ];

    const insertRes = await queryDb(
      `INSERT INTO event_reservations (event_name, name, email, phone, seats, volunteer_commitment, companions)
       VALUES ($1, $2, $3, $4, 1, 'vendor', $5) RETURNING id`,
      [
        body.event_name,
        body.contact_name,
        body.email,
        body.phone,
        JSON.stringify(vendorMeta),
      ]
    );
    const id = insertRes.rows[0]?.id;

    await queryDb(
      "UPDATE users SET kind = 'vendor' WHERE LOWER(email) = LOWER($1)",
      [String(body.email).trim()]
    );

    sendVendorConfirmationEmail(body.email, body.contact_name, body.business_name, body.event_name).catch((err) =>
      console.error("sendVendorConfirmationEmail failed:", err)
    );

    sendVendorAlertToAdmin({
      eventName: body.event_name,
      contactName: body.contact_name,
      businessName: body.business_name,
      email: body.email,
      phone: body.phone,
      offering: body.offering,
      website: body.website,
    }).catch((err) => console.error("sendVendorAlertToAdmin failed:", err));

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/vendors error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb(
      "SELECT id, event_name, name, email, phone, companions, status, created_at FROM event_reservations WHERE volunteer_commitment = 'vendor' ORDER BY created_at DESC"
    );
    const mappedRows = result.rows.map((row: any) => {
      let meta: any = {};
      try {
        const parsed = JSON.parse(row.companions || "[]");
        meta = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : {};
      } catch {
        meta = {};
      }
      return {
        id: row.id,
        business_name: meta.business_name || row.name,
        contact_name: row.name,
        email: row.email,
        phone: row.phone,
        event_name: row.event_name,
        offering: meta.offering || "",
        needs_space: meta.needs_space ? 1 : 0,
        status: row.status,
        created_at: row.created_at,
      };
    });
    return NextResponse.json(mappedRows);
  } catch (err: any) {
    console.error("GET /api/vendors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
