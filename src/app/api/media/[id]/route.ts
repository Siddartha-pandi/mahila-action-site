import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = Number(resolvedParams.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const res = await queryDb(
      "SELECT filename, mime_type, byte_size, data FROM media WHERE id = $1 LIMIT 1",
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const row = res.rows[0];
    const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": row.mime_type || "image/jpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename || `media-${id}`)}"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/media/[id] error:", err);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const resolvedParams = await Promise.resolve(params);
    const id = Number(resolvedParams.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const res = await queryDb("DELETE FROM media WHERE id = $1 RETURNING id", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/media/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
  }
}
