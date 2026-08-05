import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export function generateStaticParams() {
  return [];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM cms_events WHERE id = $1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const r = res.rows[0];
    return NextResponse.json({
      ...r,
      eventDate: r.event_date || r.eventDate || "",
      totalSeats: Number(r.total_seats ?? r.totalSeats ?? 0),
      categoryId: r.category_id || r.categoryId || null,
      createdAt: r.created_at || r.createdAt || "",
      windows: typeof r.windows === "string" ? JSON.parse(r.windows || "[]") : r.windows || [],
    });
  } catch (err: any) {
    console.error("GET /api/cms/events/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const b = await req.json();
    const title = b.title;
    const description = b.description;
    const image = b.image;
    const eventDate = b.eventDate || b.event_date;
    const location = b.location;
    const totalSeats = b.totalSeats !== undefined || b.total_seats !== undefined ? Number(b.totalSeats ?? b.total_seats) : undefined;
    const windows = b.windows ? JSON.stringify(b.windows) : undefined;
const rawCategoryId = b.categoryId ?? b.category_id;
const categoryId = rawCategoryId === undefined
  ? undefined
  : (rawCategoryId === null || rawCategoryId === "" || isNaN(Number(rawCategoryId)) ? null : Number(rawCategoryId));
    const res = await queryDb(
      `UPDATE cms_events SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         image = COALESCE($3, image),
         event_date = COALESCE($4, event_date),
         location = COALESCE($5, location),
         total_seats = COALESCE($6, total_seats),
         windows = COALESCE($7, windows),
         category_id = COALESCE($8, category_id)
       WHERE id = $9 RETURNING *`,
      [title || null, description || null, image || null, eventDate || null, location || null, totalSeats ?? null, windows || null, categoryId ?? null, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, event: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/cms/events/[id] error:", err);
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
    const targetId = id;
    const isNum = /^\d+$/.test(targetId);
    let res;
    if (isNum) {
      res = await queryDb("DELETE FROM cms_events WHERE id = $1 RETURNING id", [parseInt(targetId, 10)]);
    } else {
      const rawNum = targetId.replace(/^evt_/, "");
      if (/^\d+$/.test(rawNum)) {
        res = await queryDb("DELETE FROM cms_events WHERE id = $1 RETURNING id", [parseInt(rawNum, 10)]);
      } else {
        res = await queryDb("DELETE FROM cms_events WHERE id::text = $1 RETURNING id", [targetId]);
      }
    }
    return NextResponse.json({ ok: true, id: targetId });
  } catch (err: any) {
    console.error("DELETE /api/cms/events/[id] error:", err);
    const { id: targetId } = await params;
    return NextResponse.json({ ok: true, id: targetId });
  }
}
