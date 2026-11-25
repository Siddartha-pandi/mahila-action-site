import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { ensureMediaUrl } from "@/lib/mediaServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeParseJsonArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseCategoryId(raw: unknown): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const n = Number(raw);
  if (!Number.isNaN(n)) return n;
  const catMap: Record<string, number> = {
    cat_women: 1,
    cat_education: 2,
    cat_livelihood: 3,
    cat_wellbeing: 4,
  };
  return catMap[String(raw).toLowerCase().trim()] ?? null;
}

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
        ), 0)::int AS attendee_count,
        COALESCE((
          SELECT COUNT(*)
          FROM event_reservations r
          WHERE (r.event_id = e.id OR LOWER(r.event_name) = LOWER(e.title))
            AND (r.volunteer_commitment IS NOT NULL AND r.volunteer_commitment != '' AND r.volunteer_commitment != 'none' AND r.volunteer_commitment != 'attendee' AND r.volunteer_commitment != 'vendor')
        ), 0)::int AS volunteer_count
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
    const maxVolunteers = Number(r.max_volunteers ?? r.maxVolunteers ?? 0);
    const volunteerCount = Number(r.volunteer_count ?? r.volunteerCount ?? 0);
    const remainingVolunteers = maxVolunteers > 0 ? Math.max(0, maxVolunteers - volunteerCount) : 0;
    return NextResponse.json({
      ...r,
      id: String(r.id),
      eventDate: r.event_date || r.eventDate || "",
      totalSeats,
      bookedSeats,
      availableSeats,
      attendeeCount: Number(r.attendee_count ?? 0),
      maxVolunteers,
      volunteerCount,
      remainingVolunteers,
      categoryId: r.category_id != null ? String(r.category_id) : r.categoryId != null ? String(r.categoryId) : null,
      published: r.published !== false && r.published !== 0 && r.published !== "false",
      createdAt: r.created_at || r.createdAt || "",
      windows: safeParseJsonArray(r.windows),
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
    const idMatch = String(id || "").match(/^(?:evt_)?(?:default_)?(\d+)$/);
    if (!idMatch) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }
    const numericId = parseInt(idMatch[1], 10);
    const b = await req.json();

    const existingCheck = await queryDb("SELECT title, total_seats FROM events WHERE id = $1", [numericId], { noCache: true });
    const existingTitle = existingCheck.rows[0]?.title;

    const hasTitle = b.title !== undefined && String(b.title).trim().length > 0;
    const title = hasTitle ? String(b.title).trim() : null;
    const hasDescription = b.description !== undefined;
    const description = hasDescription ? String(b.description ?? "") : null;
    const hasImage = b.image !== undefined;
    const image = hasImage ? (b.image ? await ensureMediaUrl(b.image, `event-${numericId}.png`) : "") : null;
    const rawEventDate = b.eventDate !== undefined ? b.eventDate : b.event_date;
    const hasEventDate = rawEventDate !== undefined && String(rawEventDate).trim().length > 0;
    const eventDate = hasEventDate ? String(rawEventDate).trim() : null;
    const hasLocation = b.location !== undefined;
    const location = hasLocation ? String(b.location ?? "") : null;
    const totalSeatsNum =
      b.totalSeats !== undefined || b.total_seats !== undefined ? Number(b.totalSeats ?? b.total_seats) : undefined;
    const totalSeats = totalSeatsNum !== undefined && !Number.isNaN(totalSeatsNum) ? Math.max(0, totalSeatsNum) : null;
    const maxVolunteersNum =
      b.maxVolunteers !== undefined || b.max_volunteers !== undefined
        ? Number(b.maxVolunteers ?? b.max_volunteers)
        : undefined;
    const maxVolunteers =
      maxVolunteersNum !== undefined && !Number.isNaN(maxVolunteersNum) ? Math.max(0, maxVolunteersNum) : null;
    const windows = b.windows !== undefined ? JSON.stringify(b.windows) : null;
    const hasCategoryUpdate = b.categoryId !== undefined || b.category_id !== undefined;
    const categoryId = hasCategoryUpdate
      ? parseCategoryId(b.categoryId !== undefined ? b.categoryId : b.category_id)
      : null;
    const published = b.published !== undefined ? Boolean(b.published) : null;

    const res = await queryDb(
      `UPDATE events SET
         title = CASE WHEN $1::boolean THEN $2 ELSE title END,
         description = CASE WHEN $3::boolean THEN $4 ELSE description END,
         image = CASE WHEN $5::boolean THEN $6 ELSE image END,
         event_date = CASE WHEN $7::boolean THEN $8 ELSE event_date END,
         location = CASE WHEN $9::boolean THEN $10 ELSE location END,
         total_seats = COALESCE($11, total_seats),
         max_volunteers = COALESCE($12, max_volunteers),
         windows = COALESCE($13, windows),
         category_id = CASE WHEN $14::boolean THEN $15::int ELSE category_id END,
         published = COALESCE($16, published)
       WHERE id = $17 RETURNING *`,
      [
        hasTitle,
        title,
        hasDescription,
        description,
        hasImage,
        image,
        hasEventDate,
        eventDate,
        hasLocation,
        location,
        totalSeats,
        maxVolunteers,
        windows,
        hasCategoryUpdate,
        categoryId,
        published,
        numericId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updatedEvent = res.rows[0];
    const finalNumericId = numericId;

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
    let numId: number | null = null;
    if (/^\d+$/.test(targetId)) {
      numId = parseInt(targetId, 10);
    } else {
      const match = targetId.match(/^(?:evt_)?(?:default_)?(\d+)$/);
      if (match) {
        numId = parseInt(match[1], 10);
      }
    }

    if (numId !== null) {
      const delRes = await queryDb("DELETE FROM events WHERE id = $1 RETURNING id", [numId]);
      if (delRes.rows.length === 0) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: targetId });
  } catch (err: any) {
    console.error("DELETE /api/cms/events/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
