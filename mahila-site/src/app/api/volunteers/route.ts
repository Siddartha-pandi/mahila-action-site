import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { isValidPhoneNumber } from "@/lib/validation";
import { sendVolunteerConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requiredFields = ["name", "email", "phone"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }
    if (body.phone && !isValidPhoneNumber(String(body.phone))) {
      return NextResponse.json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." }, { status: 400 });
    }

    // ── Duplicate guard ──────────────────────────────────────────────────
    // Nothing stopped the same person volunteering for the same event again
    // and again — a double-click, or a second visit to the dashboard, filed a
    // fresh application every time. Events this email already covers are
    // dropped; if that leaves nothing, the whole request is a repeat.
    const requested: string[] = Array.isArray(body.selected_events)
      ? body.selected_events.map((t: unknown) => String(t)).filter((t: string) => t.trim() !== "")
      : [];
    let selectedEvents = requested;

    if (requested.length > 0) {
      const existing = await queryDb(
        "SELECT selected_events FROM volunteer_registrations WHERE LOWER(email) = LOWER($1)",
        [String(body.email).trim()]
      );
      const alreadyRegistered = new Set<string>();
      for (const row of existing.rows) {
        let titles: unknown = row.selected_events;
        if (typeof titles === "string") {
          try {
            titles = JSON.parse(titles);
          } catch {
            titles = [];
          }
        }
        if (Array.isArray(titles)) {
          titles.forEach((t) => alreadyRegistered.add(String(t).trim().toLowerCase()));
        }
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

    const id = nanoid();
    await queryDb(
      `INSERT INTO volunteer_registrations (id, name, email, phone, skills, selected_events)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        body.name,
        body.email,
        body.phone,
        body.skills || null,
        JSON.stringify(selectedEvents),
      ]
    );

    await queryDb(
      "UPDATE users SET kind = 'volunteer' WHERE LOWER(email) = LOWER($1)",
      [String(body.email).trim()]
    );

    sendVolunteerConfirmationEmail(body.email, body.name, selectedEvents).catch((err) =>
      console.error("sendVolunteerConfirmationEmail failed:", err)
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/volunteers error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM volunteer_registrations ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/volunteers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
