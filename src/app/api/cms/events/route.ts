import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const result = await queryDb("SELECT * FROM cms_events ORDER BY event_date ASC");
    return NextResponse.json(
      result.rows.map((r: any) => ({
        ...r,
        eventDate: r.event_date || r.eventDate || "",
        totalSeats: Number(r.total_seats ?? r.totalSeats ?? 0),
        categoryId: r.category_id || r.categoryId || null,
        createdAt: r.created_at || r.createdAt || "",
        windows: typeof r.windows === "string" ? JSON.parse(r.windows || "[]") : r.windows || [],
      })),
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/cms/events error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const title = b.title || "New Event";
    const eventDate = b.eventDate || b.event_date || new Date().toISOString().slice(0, 10);
    const totalSeats = Number(b.totalSeats ?? b.total_seats ?? 0);
    const categoryId = b.categoryId || b.category_id || null;
    const id = b.id || nanoid();

    await queryDb(
      `INSERT INTO cms_events (id, title, description, image, event_date, location, total_seats, windows, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, image=EXCLUDED.image,
         event_date=EXCLUDED.event_date, location=EXCLUDED.location, total_seats=EXCLUDED.total_seats,
         windows=EXCLUDED.windows, category_id=EXCLUDED.category_id`,
      [
        id,
        title,
        b.description || null,
        b.image || null,
        eventDate,
        b.location || null,
        totalSeats,
        JSON.stringify(b.windows || []),
        categoryId,
      ]
    );
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("POST /api/cms/events error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
