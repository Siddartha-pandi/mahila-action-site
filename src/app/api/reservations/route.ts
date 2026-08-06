import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { firstError, validateEmail, validateName, validatePhone, validateSeats, validateText } from "@/lib/validation";
import { sendReservationConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invalid = firstError(
      validateName(body.name),
      validateEmail(body.email),
      validatePhone(body.phone),
      validateText(body.event_name, "the event name", { max: 200 }),
      body.seats === undefined || body.seats === null ? null : validateSeats(body.seats)
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // Companions are booked on someone else's behalf, so their details get the
    // same treatment as the lead booker's.
    const companions = Array.isArray(body.companions) ? body.companions : [];
    for (const [i, companion] of companions.entries()) {
      const badCompanion = firstError(
        validateName(companion?.name, `name for additional guest ${i + 1}`),
        validatePhone(companion?.phone, `phone number for additional guest ${i + 1}`)
      );
      if (badCompanion) {
        return NextResponse.json({ error: badCompanion }, { status: 400 });
      }
    }

    // One booking per person per event. Attendees and volunteers for the same event
    // are mutually exclusive: if you registered as an attendee, you do not need to
    // register as a volunteer, and vice versa.
    const isVolunteerSignup = Boolean(body.volunteer_commitment);
    const existing = await queryDb(
      `SELECT id, volunteer_commitment FROM event_reservations
       WHERE LOWER(email) = LOWER($1)
         AND LOWER(event_name) = LOWER($2)
       LIMIT 1`,
      [String(body.email).trim(), String(body.event_name).trim()]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const isExistingVolunteer = Boolean(row.volunteer_commitment && row.volunteer_commitment !== "vendor");

      if (isVolunteerSignup) {
        if (isExistingVolunteer) {
          return NextResponse.json(
            { error: `You've already signed up as a volunteer for ${body.event_name}.` },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: `You are already registered as an attendee for ${body.event_name} (attendees do not need to register as volunteers).` },
            { status: 409 }
          );
        }
      } else {
        if (isExistingVolunteer) {
          return NextResponse.json(
            { error: `You are already registered as a volunteer for ${body.event_name} (volunteers do not need to register as attendees).` },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: `You already have a seat reserved for ${body.event_name}. Please contact us if you need to change the number of seats.` },
            { status: 409 }
          );
        }
      }
    }

    const insertRes = await queryDb(
      `INSERT INTO event_reservations (event_name, name, email, phone, seats, volunteer_commitment, companions)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        body.event_name,
        body.name,
        body.email,
        body.phone,
        Number(body.seats) || 1,
        body.volunteer_commitment || null,
        JSON.stringify(body.companions || []),
      ]
    );
    const id = insertRes.rows[0]?.id;

    const assignedSubRole = isVolunteerSignup ? "volunteer" : "attendee";
    await queryDb(
      "UPDATE users SET kind = $1 WHERE LOWER(email) = LOWER($2)",
      [assignedSubRole, String(body.email).trim()]
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
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb(
      "SELECT * FROM event_reservations WHERE volunteer_commitment IS NULL OR volunteer_commitment = '' OR volunteer_commitment = 'none' OR volunteer_commitment = 'attendee' ORDER BY created_at DESC"
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/reservations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
