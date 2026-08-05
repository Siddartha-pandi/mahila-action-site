import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT * FROM cms_categories ORDER BY name ASC");
    return NextResponse.json(result.rows, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    console.error("GET /api/cms/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    let finalId = b.id;

    // If caller provided a numeric id, try update first, otherwise insert with that id
    if (b.id && !isNaN(Number(b.id))) {
      const upd = await queryDb(
        `UPDATE cms_categories SET name = $2 WHERE id = $1 RETURNING id`,
        [Number(b.id), b.name]
      );
      if (upd.rowCount === 0) {
        // No existing row with that id -> insert
        await queryDb(`INSERT INTO cms_categories (id, name) VALUES ($1, $2)`, [Number(b.id), b.name]);
      }
      finalId = Number(b.id);
    } else {
      // No id provided: find existing category by (case-insensitive) name first
      const existing = await queryDb(`SELECT id FROM cms_categories WHERE LOWER(name) = LOWER($1) LIMIT 1`, [b.name]);
      if (existing.rowCount > 0) {
        finalId = existing.rows[0].id;
      } else {
        const res = await queryDb(`INSERT INTO cms_categories (name) VALUES ($1) RETURNING id`, [b.name]);
        finalId = res.rows[0]?.id;
      }
    }

    return NextResponse.json({ ok: true, id: finalId });
  } catch (err: any) {
    console.error("POST /api/cms/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
