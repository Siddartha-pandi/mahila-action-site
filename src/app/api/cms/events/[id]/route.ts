import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { ensureMediaUrl } from "@/lib/mediaServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await queryDb(
      `SELECT e.*,
        COALESCE((
          SELECT SUM(r.seats)
          FROM event_reservations r
          WHERE (r.event_id = e.id OR LOWER(r.event_name) = LOWER(e.title))
            AND (r.volunteer_commitment IS NULL OR r.volunteer_commitment = '' OR r.volunteer_commitment = 'none' OR r.volunteer_commitment = 'attendee')
        ), 0)::int AS booked_seats,
        COALESCE((
          SELECT COUNT(*)
          FROM event_reservations r
          WHERE (r.event_id = e.id OR LOWER(r.event_name) = LOWER(e.title))
            AND (r.volunteer_commitment IS NULL OR r.volunteer_commitment = '' OR r.volunteer_commitment = 'none' OR r.volunteer_commitment = 'attendee')
        ), 0)::int AS attendee_count
       FROM events e
       WHERE e.id = $1`,
      [id],
      { noCache: true }
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const r = res.rows[0];
    const totalSeats = Number(r.total_seats ?? r.totalSeats ?? 0);
    const bookedSeats = Number(r.booked_seats ?? 0);
    const availableSeats = totalSeats > 0 ? Math.max(0, totalSeats - bookedSeats) : 0;
    return NextResponse.json({
      ...r,
      id: String(r.id),
      eventDate: r.event_date || r.eventDate || "",
      totalSeats,
      bookedSeats,
      availableSeats,
      attendeeCount: Number(r.attendee_count ?? 0),
      maxVolunteers: Number(r.max_volunteers ?? r.maxVolunteers ?? 0),
      categoryId: r.category_id != null ? String(r.category_id) : r.categoryId != null ? String(r.categoryId) : null,
      published: r.published !== false && r.published !== 0 && r.published !== "false",
      createdAt: r.created_at || r.createdAt || "",
      windows: typeof r.windows === "string" ? JSON.parse(r.windows || "[]") : r.windows || [],
    });
  } catch (err: any) {
    console.error("GET /api/cms/events/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "events", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const b = await req.json();

    const existingCheck = await queryDb("SELECT title, total_seats FROM events WHERE id = $1", [id], { noCache: true });
    const existingTitle = existingCheck.rows[0]?.title;

    const title = b.title;
    const description = b.description;
    const image = b.image !== undefined ? await ensureMediaUrl(b.image, `event-${id}.png`) : undefined;
    const eventDate = b.eventDate || b.event_date;
    const location = b.location;
    const totalSeats = b.totalSeats !== undefined || b.total_seats !== undefined ? Number(b.totalSeats ?? b.total_seats) : undefined;
    const maxVolunteers = b.maxVolunteers !== undefined || b.max_volunteers !== undefined ? Number(b.maxVolunteers ?? b.max_volunteers) : undefined;
    const windows = b.windows ? JSON.stringify(b.windows) : undefined;
    const categoryId = b.categoryId !== undefined || b.category_id !== undefined ? (b.categoryId || b.category_id ? Number(b.categoryId || b.category_id) : null) : undefined;
    const published = b.published !== undefined ? Boolean(b.published) : undefined;

    const res = await queryDb(
      `UPDATE events SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         image = COALESCE($3, image),
         event_date = COALESCE($4, event_date),
         location = COALESCE($5, location),
         total_seats = COALESCE($6, total_seats),
         max_volunteers = COALESCE($7, max_volunteers),
         windows = COALESCE($8, windows),
         category_id = COALESCE($9, category_id),
         published = COALESCE($10, published)
       WHERE id = $11 RETURNING *`,
      [title || null, description || null, image || null, eventDate || null, location || null, totalSeats ?? null, maxVolunteers ?? null, windows || null, categoryId ?? null, published ?? null, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updatedEvent = res.rows[0];
    const finalNumericId = Number(id) || null;

    // Link event_id if missing
    if (finalNumericId) {
      await queryDb(
        `UPDATE event_reservations
         SET event_id = $1
         WHERE event_id IS NULL AND LOWER(event_name) = LOWER($2)`,
        [finalNumericId, existingTitle || updatedEvent.title]
      ).catch(() => {});
    }

    // Cascade event_name update to event_reservations if title changed
    if (title && existingTitle && title !== existingTitle && finalNumericId) {
      await queryDb(
        `UPDATE event_reservations
         SET event_name = $1
         WHERE event_id = $2 OR LOWER(event_name) = LOWER($3)`,
        [title, finalNumericId, existingTitle]
      ).catch(() => {});
    }

    const statsRes = await queryDb(
      `SELECT
        COALESCE(SUM(seats), 0)::int AS booked_seats,
        COALESCE(COUNT(*), 0)::int AS attendee_count
       FROM event_reservations
       WHERE (event_id = $1 OR LOWER(event_name) = LOWER($2))
         AND (volunteer_commitment IS NULL OR volunteer_commitment = '' OR volunteer_commitment = 'none' OR volunteer_commitment = 'attendee')`,
      [finalNumericId || 0, updatedEvent.title]
    ).catch(() => ({ rows: [] }));

    const bookedSeats = Number(statsRes.rows[0]?.booked_seats || 0);
    const finalTotalSeats = Number(updatedEvent.total_seats ?? 0);
    const availableSeats = finalTotalSeats > 0 ? Math.max(0, finalTotalSeats - bookedSeats) : 0;

    return NextResponse.json({
      ok: true,
      event: {
        ...updatedEvent,
        bookedSeats,
        availableSeats,
        attendeeCount: Number(statsRes.rows[0]?.attendee_count || 0),
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/cms/events/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "events", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const targetId = id;
    const isNum = /^\d+$/.test(targetId);
    let res;
    if (isNum) {
      res = await queryDb("DELETE FROM events WHERE id = $1 RETURNING id", [parseInt(targetId, 10)]);
    } else {
      const rawNum = targetId.replace(/^evt_/, "");
      if (/^\d+$/.test(rawNum)) {
        res = await queryDb("DELETE FROM events WHERE id = $1 RETURNING id", [parseInt(rawNum, 10)]);
      } else {
        res = await queryDb("DELETE FROM events WHERE id::text = $1 RETURNING id", [targetId]);
      }
    }
    return NextResponse.json({ ok: true, id: targetId });
  } catch (err: any) {
    console.error("DELETE /api/cms/events/[id] error:", err);
    const { id: targetId } = await params;
    return NextResponse.json({ ok: true, id: targetId });
  }
}
