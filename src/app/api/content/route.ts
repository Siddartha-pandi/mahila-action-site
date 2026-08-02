import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT key, value FROM site_content");
    const map: Record<string, string> = {};
    for (const row of result.rows) map[row.key] = row.value;
    return NextResponse.json(map);
  } catch (err: any) {
    console.error("GET /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const content = await req.json();
    const entries = Object.entries(content || {});

    for (const [key, value] of entries) {
      await queryDb(
        `INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP::text)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [key, String(value)]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
