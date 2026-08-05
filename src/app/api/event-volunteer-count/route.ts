import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

/**
 * GET /api/event-volunteer-count?title=...
 *
 * Returns the current volunteer registration count for a specific event.
 * Used by the frontend to check if the volunteer cap has been reached
 * before showing the registration modal.
 * No auth required — returns only aggregate count, no personal data.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "").trim();

  if (!title) {
    return NextResponse.json({ count: 0, maxVolunteers: 0 });
  }

  try {
    const [countRes, capRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS cnt FROM event_reservations
         WHERE LOWER(event_name) = LOWER($1)
           AND volunteer_commitment IS NOT NULL
           AND volunteer_commitment != ''
           AND volunteer_commitment != 'none'
           AND volunteer_commitment != 'attendee'
           AND volunteer_commitment != 'vendor'`,
        [title]
      ),
      queryDb(
        "SELECT max_volunteers FROM cms_events WHERE LOWER(title) = LOWER($1) LIMIT 1",
        [title]
      ),
    ]);

    const count = Number(countRes.rows[0]?.cnt ?? 0);
    const maxVolunteers = Number(capRes.rows[0]?.max_volunteers ?? 0);

    return NextResponse.json({ count, maxVolunteers });
  } catch (err: any) {
    console.error("GET /api/event-volunteer-count error:", err);
    return NextResponse.json({ count: 0, maxVolunteers: 0 });
  }
}
