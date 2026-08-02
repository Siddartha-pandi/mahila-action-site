import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT * FROM cms_timeline ORDER BY order_index ASC");
    return NextResponse.json(
      result.rows.map((r: any) => ({
        ...r,
        order: Number(r.order_index ?? r.order ?? 0),
      }))
    );
  } catch (err: any) {
    console.error("GET /api/cms/timeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const orderIndex = Number(b.order ?? b.order_index ?? 0);
    let finalId = b.id;

    if (b.id && !isNaN(Number(b.id))) {
      await queryDb(
        `INSERT INTO cms_timeline (id, year, title, description, image, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT(id) DO UPDATE SET year=EXCLUDED.year, title=EXCLUDED.title, description=EXCLUDED.description,
           image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
        [Number(b.id), b.year, b.title, b.description || null, b.image || null, orderIndex]
      );
    } else {
      const res = await queryDb(
        `INSERT INTO cms_timeline (year, title, description, image, order_index)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [b.year, b.title, b.description || null, b.image || null, orderIndex]
      );
      finalId = res.rows[0]?.id;
    }
    return NextResponse.json({ ok: true, id: finalId });
  } catch (err: any) {
    console.error("POST /api/cms/timeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
