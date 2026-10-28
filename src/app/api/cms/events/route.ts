import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const result = await queryDb("SELECT * FROM events ORDER BY event_date ASC", [], { noCache: true });
    return NextResponse.json(
      result.rows.map((r: any) => ({
        ...r,
        id: String(r.id),
        eventDate: r.event_date || r.eventDate || "",
        totalSeats: Number(r.total_seats ?? r.totalSeats ?? 0),
        maxVolunteers: Number(r.max_volunteers ?? r.maxVolunteers ?? 0),
        categoryId: r.category_id != null ? String(r.category_id) : r.categoryId != null ? String(r.categoryId) : null,
        published: r.published !== false && r.published !== 0 && r.published !== "false",
        createdAt: r.created_at || r.createdAt || "",
        windows: typeof r.windows === "string" ? JSON.parse(r.windows || "[]") : r.windows || [],
      })),
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
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
    const rawId = b.id != null ? String(b.id).replace(/^evt_/, "") : "";
    const isNumericId = Boolean(rawId && !isNaN(Number(rawId)) && Number(rawId) > 0);
    const targetNumericId = isNumericId ? Number(rawId) : null;

    // Check if updating an existing event
    let existingRow: any = null;
    if (targetNumericId !== null) {
      const checkRes = await queryDb("SELECT * FROM events WHERE id = $1", [targetNumericId], { noCache: true });
      if (checkRes.rows && checkRes.rows.length > 0) {
        existingRow = checkRes.rows[0];
      }
    }

    const title = b.title !== undefined ? (b.title || "New Event") : (existingRow?.title || "New Event");
    const eventDate = b.eventDate || b.event_date || existingRow?.event_date || new Date().toISOString().slice(0, 10);
    const description = b.description !== undefined ? (b.description || null) : (existingRow?.description || null);
    const image = b.image !== undefined ? (b.image || null) : (existingRow?.image || null);
    const location = b.location !== undefined ? (b.location || null) : (existingRow?.location || null);

    const totalSeatsNum = Number(b.totalSeats ?? b.total_seats ?? existingRow?.total_seats ?? 0);
    const totalSeats = !isNaN(totalSeatsNum) ? totalSeatsNum : 0;

    const maxVolunteersNum = Number(b.maxVolunteers ?? b.max_volunteers ?? existingRow?.max_volunteers ?? 0);
    const maxVolunteers = !isNaN(maxVolunteersNum) ? maxVolunteersNum : 0;

    // Resolve categoryId safely to avoid passing NaN to PostgreSQL INTEGER column
    let resolvedCategoryId: number | null = null;
    const rawCat = b.categoryId !== undefined ? b.categoryId : (b.category_id !== undefined ? b.category_id : existingRow?.category_id);
    if (rawCat != null && rawCat !== "") {
      if (typeof rawCat === "number" && !isNaN(rawCat)) {
        resolvedCategoryId = rawCat;
      } else if (!isNaN(Number(rawCat))) {
        resolvedCategoryId = Number(rawCat);
      } else {
        const catMap: Record<string, number> = {
          cat_women: 1,
          cat_education: 2,
          cat_livelihood: 3,
          cat_wellbeing: 4,
        };
        resolvedCategoryId = catMap[String(rawCat).toLowerCase()] || null;
      }
    }

    // Published status: if explicitly provided, respect it; otherwise fall back to existingRow or default true
    let published = true;
    if (b.published !== undefined) {
      published = b.published !== false && b.published !== 0 && b.published !== "false";
    } else if (existingRow) {
      published = existingRow.published !== false && existingRow.published !== 0 && existingRow.published !== "false";
    }

    const rawWindows = b.windows !== undefined ? b.windows : existingRow?.windows;
    const windowsJson = typeof rawWindows === "string" ? rawWindows : JSON.stringify(rawWindows || []);

    let finalId = b.id;

    if (existingRow && targetNumericId !== null) {
      await queryDb(
        `UPDATE events SET
           title = $1,
           description = $2,
           image = $3,
           event_date = $4,
           location = $5,
           total_seats = $6,
           max_volunteers = $7,
           windows = $8,
           category_id = $9,
           published = $10
         WHERE id = $11`,
        [
          title,
          description,
          image,
          eventDate,
          location,
          totalSeats,
          maxVolunteers,
          windowsJson,
          resolvedCategoryId,
          published,
          targetNumericId,
        ]
      );
      finalId = targetNumericId;
    } else if (targetNumericId !== null) {
      await queryDb(
        `INSERT INTO events (id, title, description, image, event_date, location, total_seats, max_volunteers, windows, category_id, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT(id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           image = EXCLUDED.image,
           event_date = EXCLUDED.event_date,
           location = EXCLUDED.location,
           total_seats = EXCLUDED.total_seats,
           max_volunteers = EXCLUDED.max_volunteers,
           windows = EXCLUDED.windows,
           category_id = EXCLUDED.category_id,
           published = EXCLUDED.published`,
        [
          targetNumericId,
          title,
          description,
          image,
          eventDate,
          location,
          totalSeats,
          maxVolunteers,
          windowsJson,
          resolvedCategoryId,
          published,
        ]
      );
      finalId = targetNumericId;
    } else {
      const res = await queryDb(
        `INSERT INTO events (title, description, image, event_date, location, total_seats, max_volunteers, windows, category_id, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          title,
          description,
          image,
          eventDate,
          location,
          totalSeats,
          maxVolunteers,
          windowsJson,
          resolvedCategoryId,
          published,
        ]
      );
      finalId = res.rows[0]?.id;
    }

    return NextResponse.json({ ok: true, id: String(finalId) });
  } catch (err: any) {
    console.error("POST /api/cms/events error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
