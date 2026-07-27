import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { isValidPhoneNumber } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requiredFields = ["name", "email", "message"];
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
      `INSERT INTO contact_submissions (id, name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        body.name,
        body.email,
        body.phone || null,
        body.subject || null,
        body.message,
      ]
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/contact error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM contact_submissions ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/contact error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
