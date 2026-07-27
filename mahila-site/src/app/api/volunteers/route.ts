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
        JSON.stringify(body.selected_events || []),
      ]
    );

    sendVolunteerConfirmationEmail(body.email, body.name, body.selected_events || []).catch((err) =>
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
