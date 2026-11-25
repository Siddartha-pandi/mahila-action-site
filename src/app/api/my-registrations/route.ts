import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import {
  generateReceiptToken,
  getUserSessionFromRequest,
  verifyAdminPermission,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/my-registrations?email=...&phone=...
 *
 * Returns event registrations, permanent volunteer requests, and sanitized donation
 * records for the authenticated user (scoped strictly to their account's DB email/phone),
 * or for an authorized submissions admin inspecting a user's records.
 */
export async function GET(req: NextRequest) {
  const userSess = await getUserSessionFromRequest(req);
  const adminCheck = await verifyAdminPermission(req, "submissions", "view");

  if (!userSess && !adminCheck.authorized) {
    return NextResponse.json(
      { error: "Authentication required to view registrations." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  let email = (searchParams.get("email") || "").trim();
  let phone = (searchParams.get("phone") || "").trim();

  if (!adminCheck.authorized && userSess) {
    // Scope non-admin requests strictly to the authenticated user's own DB record.
    let dbEmail = userSess.email;
    let dbPhone = "";
    try {
      const userRes =
        userSess.sub && /^\d+$/.test(String(userSess.sub))
          ? await queryDb("SELECT email, phone FROM users WHERE id = $1 LIMIT 1", [userSess.sub], { noCache: true })
          : await queryDb("SELECT email, phone FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [userSess.email], { noCache: true });

      if (userRes.rows.length > 0) {
        dbEmail = userRes.rows[0].email || dbEmail;
        dbPhone = userRes.rows[0].phone || "";
      }
    } catch {}
    email = String(dbEmail || "").trim();
    phone = String(dbPhone || "").trim();
  }

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

    const sanitizedDonations = donationsResult.rows.map((row: any) => ({
      ...row,
      pan_number: row.pan_number ? `${String(row.pan_number).slice(0, 2)}******${String(row.pan_number).slice(-2)}` : null,
      address: row.address ? "Address on file" : null,
      receipt_token: generateReceiptToken(row.id),
    }));

    const allRows = [...result.rows, ...permResult.rows, ...sanitizedDonations].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(allRows, {
      headers: { "Cache-Control": "no-store" },
    });

  } catch (err: any) {
    console.error("GET /api/my-registrations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
