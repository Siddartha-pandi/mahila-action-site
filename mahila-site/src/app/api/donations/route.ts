import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { isValidPhoneNumber } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requiredFields = ["amount", "phone", "donation_type"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }
    if (body.phone && !isValidPhoneNumber(String(body.phone))) {
      return NextResponse.json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." }, { status: 400 });
    }

    const id = nanoid();
    await queryDb(
      `INSERT INTO donations (id, amount, name, email, phone, donation_type, anonymous, event_name, campaign_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        Number(body.amount),
        body.name || null,
        body.email || null,
        body.phone,
        body.donation_type === "monthly" ? "monthly" : "one-time",
        body.anonymous ? 1 : 0,
        body.event_name || null,
        body.campaign_name || null,
      ]
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/donations error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM donations ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/donations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
