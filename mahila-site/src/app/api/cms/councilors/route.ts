import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT * FROM cms_councilors ORDER BY order_index ASC");
    return NextResponse.json(
      result.rows.map((r: any) => ({
        ...r,
        order: Number(r.order_index ?? r.order ?? 0),
      }))
    );
  } catch (err: any) {
    console.error("GET /api/cms/councilors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const id = b.id || nanoid();
    const orderIndex = Number(b.order ?? b.order_index ?? 0);

    await queryDb(
      `INSERT INTO cms_councilors (id, name, role, bio, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, bio=EXCLUDED.bio,
         image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [id, b.name, b.role || null, b.bio || null, b.image || null, orderIndex]
    );
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("POST /api/cms/councilors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
