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
        "SELECT event_name, volunteer_commitment FROM event_reservations WHERE LOWER(email) = LOWER($1) AND (volunteer_commitment IS NULL OR volunteer_commitment != 'vendor')",
        [String(body.email).trim()]
      );
      const volunteerEvents = new Set<string>();
      const attendeeEvents = new Set<string>();

      for (const row of existing.rows) {
        if (row.event_name) {
          const normName = String(row.event_name).trim().toLowerCase();
          if (row.volunteer_commitment) {
            volunteerEvents.add(normName);
          } else {
            attendeeEvents.add(normName);
          }
        }
      }

      const alreadyVol = requested.filter((t) => volunteerEvents.has(t.trim().toLowerCase()));
      const alreadyAtt = requested.filter((t) => attendeeEvents.has(t.trim().toLowerCase()));

      selectedEvents = requested.filter((t) => !volunteerEvents.has(t.trim().toLowerCase()) && !attendeeEvents.has(t.trim().toLowerCase()));

      if (selectedEvents.length === 0) {
        if (alreadyAtt.length > 0 && alreadyVol.length === 0) {
          return NextResponse.json(
            {
              error:
                requested.length === 1
                  ? `You are already registered as an attendee for ${requested[0]} (attendees do not need to register as volunteers).`
                  : "You are already registered as an attendee for the selected event(s) (attendees do not need to register as volunteers).",
            },
            { status: 409 }
          );
        }
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
      // ── Volunteer cap check ───────────────────────────────────────────────
      // Look up max_volunteers for this event in the CMS. If set (> 0), count
      // current volunteer sign-ups and block if the cap is already reached.
      const eventRow = await queryDb(
        "SELECT max_volunteers FROM cms_events WHERE LOWER(title) = LOWER($1) LIMIT 1",
        [evt.trim()]
      );
      const maxVol = Number(eventRow.rows[0]?.max_volunteers ?? 0);

      if (maxVol > 0) {
        const countRow = await queryDb(
          `SELECT COUNT(*) AS cnt FROM event_reservations
           WHERE LOWER(event_name) = LOWER($1)
             AND volunteer_commitment IS NOT NULL
             AND volunteer_commitment != ''
             AND volunteer_commitment != 'none'
             AND volunteer_commitment != 'attendee'
             AND volunteer_commitment != 'vendor'`,
          [evt.trim()]
        );
        const currentCount = Number(countRow.rows[0]?.cnt ?? 0);

        if (currentCount >= maxVol) {
          return NextResponse.json(
            {
              error: `Volunteer spots for "${evt}" are full (${maxVol}/${maxVol} filled). Please contact the organizer.`,
            },
            { status: 409 }
          );
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const insertRes = await queryDb(
        `INSERT INTO event_reservations (id, event_name, name, email, phone, seats, volunteer_commitment, companions)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $7) RETURNING id`,
        [
          nanoid(),
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
  const admin = await getAdminFromRequest(req);
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
