import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { isValidPhoneNumber } from "@/lib/validation";
import { sendReservationConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requiredFields = ["name", "email", "phone", "event_name"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }
    if (body.phone && !isValidPhoneNumber(String(body.phone))) {
      return NextResponse.json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." }, { status: 400 });
    }

    // One booking per person per event, per role. The commitment column is what
    // separates the two kinds of reservation — a volunteer sign-up and a plain
    // attendee booking for the same event are different things, so only a
    // repeat of the *same* kind counts as a duplicate.
    const isVolunteerSignup = Boolean(body.volunteer_commitment);
    const duplicate = await queryDb(
      `SELECT id FROM event_reservations
       WHERE LOWER(email) = LOWER($1)
         AND LOWER(event_name) = LOWER($2)
         AND (volunteer_commitment IS NOT NULL) = $3
       LIMIT 1`,
      [String(body.email).trim(), String(body.event_name).trim(), isVolunteerSignup]
    );
    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        {
          error: isVolunteerSignup
            ? `You've already signed up to volunteer at ${body.event_name}.`
            : `You already have a seat reserved for ${body.event_name}. Please contact us if you need to change the number of seats.`,
        },
        { status: 409 }
      );
    }

    const id = nanoid();
    await queryDb(
      `INSERT INTO event_reservations (id, event_name, name, email, phone, seats, volunteer_commitment, companions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        body.event_name,
        body.name,
        body.email,
        body.phone,
        Number(body.seats) || 1,
        body.volunteer_commitment || null,
        JSON.stringify(body.companions || []),
      ]
    );

    sendReservationConfirmationEmail(body.email, body.name, body.event_name, !!body.volunteer_commitment).catch((err) =>
      console.error("sendReservationConfirmationEmail failed:", err)
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/reservations error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM event_reservations ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/reservations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
