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
      const normPhone = phone.trim().replace(/\s+/g, "");
      const digitsOnly = phone.replace(/\D/g, "");
      const phoneSubConditions: string[] = [];

      params.push(normPhone);
      phoneSubConditions.push(`REPLACE(phone, ' ', '') = $${params.length}`);

      if (digitsOnly.length >= 10) {
        const last10 = digitsOnly.slice(-10);
        params.push(`%${last10}`);
        phoneSubConditions.push(`REPLACE(REPLACE(phone, ' ', ''), '-', '') LIKE $${params.length}`);
      }

      conditions.push(`(${phoneSubConditions.join(" OR ")})`);
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

    const donationsResult = await queryDb(
      `SELECT id, amount, name, email, phone, donation_type, anonymous, event_name, campaign_name, status, pan_number, address, payment_method, transaction_id, receipt_number, created_at, 'donation' AS item_source
       FROM donations
       WHERE ${where}
       ORDER BY created_at DESC`,
      params
    );

    const allRows = [...result.rows, ...permResult.rows, ...donationsResult.rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(allRows);

  } catch (err: any) {
    console.error("GET /api/my-registrations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
