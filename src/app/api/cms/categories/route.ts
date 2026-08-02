import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT * FROM cms_categories ORDER BY name ASC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/cms/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    let finalId = b.id;

    if (b.id && !isNaN(Number(b.id))) {
      await queryDb(
        `INSERT INTO cms_categories (id, name) VALUES ($1, $2)
         ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name`,
        [Number(b.id), b.name]
      );
    } else {
      const res = await queryDb(
        `INSERT INTO cms_categories (name) VALUES ($1)
         ON CONFLICT(name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [b.name]
      );
      finalId = res.rows[0]?.id;
    }
    return NextResponse.json({ ok: true, id: finalId });
  } catch (err: any) {
    console.error("POST /api/cms/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
