import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, request_type, message } = body || {};

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const id = nanoid();
    const typeVal = request_type === "deactivate" ? "deactivate" : "activate";

    await queryDb(
      `INSERT INTO perm_volunteer_requests (id, name, email, phone, request_type, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name.trim(), email.trim().toLowerCase(), phone || null, typeVal, message || null]
    );

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/perm-volunteers error:", err);
    return NextResponse.json({ error: "Could not save request." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM perm_volunteer_requests ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/perm-volunteers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
