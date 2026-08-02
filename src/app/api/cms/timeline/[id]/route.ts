import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export function generateStaticParams() {
  return [];
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await queryDb("SELECT * FROM cms_timeline WHERE id = $1", [params.id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });
    }
    const r = res.rows[0];
    return NextResponse.json({
      ...r,
      order: Number(r.order_index ?? r.order ?? 0),
    });
  } catch (err: any) {
    console.error("GET /api/cms/timeline/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const year = b.year;
    const title = b.title;
    const description = b.description;
    const image = b.image;
    const orderIndex = b.order !== undefined || b.order_index !== undefined ? Number(b.order ?? b.order_index) : undefined;

    const res = await queryDb(
      `UPDATE cms_timeline SET
         year = COALESCE($1, year),
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         image = COALESCE($4, image),
         order_index = COALESCE($5, order_index)
       WHERE id = $6 RETURNING *`,
      [year || null, title || null, description || null, image || null, orderIndex ?? null, params.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/cms/timeline/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const res = await queryDb("DELETE FROM cms_timeline WHERE id = $1 RETURNING id", [params.id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: params.id });
  } catch (err: any) {
    console.error("DELETE /api/cms/timeline/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
