import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export function generateStaticParams() {
  return [];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM cms_councilors WHERE id = $1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Councilor not found" }, { status: 404 });
    }
    const r = res.rows[0];
    return NextResponse.json({
      ...r,
      order: Number(r.order_index ?? r.order ?? 0),
    });
  } catch (err: any) {
    console.error("GET /api/cms/councilors/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const b = await req.json();
    const name = b.name;
    const role = b.role;
    const bio = b.bio;
    const image = b.image;
    const orderIndex = b.order !== undefined || b.order_index !== undefined ? Number(b.order ?? b.order_index) : undefined;

    const res = await queryDb(
      `UPDATE cms_councilors SET
         name = COALESCE($1, name),
         role = COALESCE($2, role),
         bio = COALESCE($3, bio),
         image = COALESCE($4, image),
         order_index = COALESCE($5, order_index)
       WHERE id = $6 RETURNING *`,
      [name || null, role || null, bio || null, image || null, orderIndex ?? null, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Councilor not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, councilor: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/cms/councilors/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const res = await queryDb("DELETE FROM cms_councilors WHERE id = $1 RETURNING id", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Councilor not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/cms/councilors/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
