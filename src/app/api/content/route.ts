import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT key, value FROM site_content");
    const map: Record<string, string> = {};
    for (const row of result.rows) map[row.key] = row.value;
    return NextResponse.json(map, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
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
    if (entries.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const placeholders = entries
      .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, CURRENT_TIMESTAMP)`)
      .join(", ");
    const params = entries.flatMap(([k, v]) => [k, String(v)]);

    await queryDb(
      `INSERT INTO site_content (key, value, updated_at) VALUES ${placeholders}
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      params
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
