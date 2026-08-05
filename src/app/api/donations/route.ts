import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sendDonationReceiptEmail } from "@/lib/email";
import { firstError, validateAmount, validateEmail, validateName, validatePhone } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.donation_type) {
      return NextResponse.json({ error: "donation_type is required." }, { status: 400 });
    }
    // Anonymous donors give neither name nor email, so those are only checked
    // when present. The amount and phone are always required.
    const invalid = firstError(
      validateAmount(body.amount),
      validatePhone(body.phone),
      body.name ? validateName(body.name) : null,
      body.email ? validateEmail(body.email) : null
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // donations.id is SERIAL — let the sequence assign it. Supplying a nanoid
    // string here makes PostgreSQL reject the whole insert (22P02).
    const insertRes = await queryDb(
      `INSERT INTO donations (amount, name, email, phone, donation_type, anonymous, event_name, campaign_id, campaign_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        Number(body.amount),
        body.name || null,
        body.email || null,
        body.phone,
        body.donation_type === "monthly" ? "monthly" : "one-time",
        body.anonymous ? 1 : 0,
        body.event_name || null,
        body.campaign_id || null,
        body.campaign_name || null,
      ]
    );
    const id = insertRes.rows[0]?.id;

    // If this donation references a campaign, try to update the campaign's raised amount
    try {
      if (body.campaign_name) {
        // Update persisted campaigns file if present
        const fs = require('fs');
        const path = require('path');
        const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'campaigns.json');
        try {
          const raw = fs.readFileSync(DATA_PATH, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const idx = parsed.findIndex((c: any) => String(c.name).trim() === String(body.campaign_name).trim() || c.id === body.campaign_name);
            if (idx !== -1) {
              parsed[idx].raised = Number(parsed[idx].raised || 0) + Number(body.amount || 0);
              fs.writeFileSync(DATA_PATH, JSON.stringify(parsed, null, 2), 'utf8');
            }
          }
        } catch (err) {
          // ignore file update errors
        }
      }
    } catch {}

    // Anonymous donors are still receipted if they gave an address to send it to.
    if (body.email) {
      await queryDb(
        "UPDATE users SET kind = 'donor' WHERE LOWER(email) = LOWER($1)",
        [String(body.email).trim()]
      );

      sendDonationReceiptEmail(
        body.email,
        body.anonymous ? "" : body.name || "",
        Number(body.amount),
        body.campaign_name || body.event_name || undefined,
        body.donation_type === "monthly"
      ).catch((err) => console.error("sendDonationReceiptEmail failed:", err));
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/donations error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM donations ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/donations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
