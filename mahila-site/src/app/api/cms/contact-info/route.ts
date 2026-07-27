import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT * FROM cms_contact WHERE id = 1");
    const r = result.rows[0] || {};
    return NextResponse.json({
      ...r,
      emailNote: r.email_note || r.emailNote || "",
      phoneNote: r.phone_note || r.phoneNote || "",
      addressNote: r.address_note || r.addressNote || "",
      hoursNote: r.hours_note || r.hoursNote || "",
    });
  } catch (err: any) {
    console.error("GET /api/cms/contact-info error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    await queryDb(
      `INSERT INTO cms_contact (id, email, email_note, phone, phone_note, address, address_note, hours, hours_note)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email, email_note=EXCLUDED.email_note, phone=EXCLUDED.phone,
         phone_note=EXCLUDED.phone_note, address=EXCLUDED.address, address_note=EXCLUDED.address_note,
         hours=EXCLUDED.hours, hours_note=EXCLUDED.hours_note`,
      [
        b.email || null,
        b.emailNote || b.email_note || null,
        b.phone || null,
        b.phoneNote || b.phone_note || null,
        b.address || null,
        b.addressNote || b.address_note || null,
        b.hours || null,
        b.hoursNote || b.hours_note || null,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/cms/contact-info error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
