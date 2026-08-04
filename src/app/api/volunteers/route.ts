import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { firstError, validateEmail, validateName, validatePhone } from "@/lib/validation";
import { sendVolunteerConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invalid = firstError(
      validateName(body.name),
      validateEmail(body.email),
      validatePhone(body.phone)
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const requested: string[] = Array.isArray(body.selected_events)
      ? body.selected_events.map((t: unknown) => String(t)).filter((t: string) => t.trim() !== "")
      : [];
    let selectedEvents = requested;

    if (requested.length > 0) {
      const existing = await queryDb(
        "SELECT event_name FROM event_reservations WHERE LOWER(email) = LOWER($1) AND volunteer_commitment IS NOT NULL AND volunteer_commitment != 'vendor'",
        [String(body.email).trim()]
      );
      const alreadyRegistered = new Set<string>();
      for (const row of existing.rows) {
        if (row.event_name) alreadyRegistered.add(String(row.event_name).trim().toLowerCase());
      }

      selectedEvents = requested.filter((t) => !alreadyRegistered.has(t.trim().toLowerCase()));
      if (selectedEvents.length === 0) {
        return NextResponse.json(
          {
            error:
              requested.length === 1
                ? `You're already registered as a volunteer for ${requested[0]}. Check "My Registered Events" in your account.`
                : "You're already registered as a volunteer for every event you selected.",
          },
          { status: 409 }
        );
      }
    }

    let firstId: string | number = "";
    const commitment = body.volunteer_commitment || "event_only";
    const eventsToSave = selectedEvents.length > 0 ? selectedEvents : ["General Volunteer"];

    for (const evt of eventsToSave) {
      const insertRes = await queryDb(
        `INSERT INTO event_reservations (event_name, name, email, phone, seats, volunteer_commitment, companions)
         VALUES ($1, $2, $3, $4, 1, $5, $6) RETURNING id`,
        [
          evt,
          body.name.trim(),
          String(body.email).trim(),
          String(body.phone).trim(),
          commitment,
          JSON.stringify([]),
        ]
      );
      if (!firstId && insertRes.rows[0]?.id) firstId = String(insertRes.rows[0].id);
    }

    await queryDb(
      "UPDATE users SET kind = 'volunteer', skills = COALESCE($1, skills) WHERE LOWER(email) = LOWER($2)",
      [body.skills || null, String(body.email).trim()]
    );

    sendVolunteerConfirmationEmail(body.email, body.name, selectedEvents).catch((err) =>
      console.error("sendVolunteerConfirmationEmail failed:", err)
    );

    return NextResponse.json({ ok: true, id: firstId }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/volunteers error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb(
      "SELECT id, name, email, phone, event_name, volunteer_commitment, companions, status, created_at FROM event_reservations WHERE volunteer_commitment IS NOT NULL AND volunteer_commitment != '' AND volunteer_commitment != 'vendor' AND volunteer_commitment != 'none' AND volunteer_commitment != 'attendee' ORDER BY created_at DESC"
    );
    const mappedRows = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      selected_events: [row.event_name],
      volunteer_commitment: row.volunteer_commitment,
      status: row.status,
      created_at: row.created_at,
    }));
    return NextResponse.json(mappedRows);
  } catch (err: any) {
    console.error("GET /api/volunteers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
