import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

/**
 * GET /api/my-registrations?email=...&phone=...
 *
 * Returns all event registrations (reservations + volunteer sign-ups) for a
 * given user identified by email or phone. No admin token required — the data
 * is scoped to the requesting user's own records only.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim();
  const phone = (searchParams.get("phone") || "").trim();

  if (!email && !phone) {
    return NextResponse.json({ error: "email or phone is required" }, { status: 400 });
  }

  try {
    // Build the WHERE clause dynamically based on which identifiers were given
    const conditions: string[] = [];
    const params: string[] = [];

    if (email) {
      params.push(email);
      conditions.push(`LOWER(email) = LOWER($${params.length})`);
    }
    if (phone) {
      // Normalise phone: strip spaces so "+91 70955 48387" matches "+917095548387"
      const normPhone = phone.replace(/\s+/g, "");
      params.push(normPhone);
      conditions.push(`REPLACE(phone, ' ', '') = $${params.length}`);
    }

    const where = conditions.join(" OR ");

    const result = await queryDb(
      `SELECT id, event_name, name, email, phone, seats, volunteer_commitment, companions, status, created_at, 'reservation' AS item_source
       FROM event_reservations
       WHERE ${where}
       ORDER BY created_at DESC`,
      params
    );

    const permResult = await queryDb(
      `SELECT id, name, email, phone, request_type, message, status, created_at, 'perm_volunteer_request' AS item_source
       FROM perm_volunteer_requests
       WHERE ${where}
       ORDER BY created_at DESC`,
      params
    );

    return NextResponse.json([...result.rows, ...permResult.rows]);

  } catch (err: any) {
    console.error("GET /api/my-registrations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
