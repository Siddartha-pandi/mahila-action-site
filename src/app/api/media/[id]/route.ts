import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { getPublicUrl, resolveStorageUrl, deleteFromStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const param = (resolvedParams.id || "").trim();
    if (!param) {
      return NextResponse.json({ error: "Invalid media ID or hash" }, { status: 400 });
    }
    const isNumeric = /^\d+$/.test(param);
    const id = isNumeric ? Number(param) : 0;

    const query = isNumeric
      ? "SELECT id, filename, mime_type, byte_size, data, object_key, bucket_name, visibility, url, url_hash, media_type FROM media WHERE id = $1 LIMIT 1"
      : "SELECT id, filename, mime_type, byte_size, data, object_key, bucket_name, visibility, url, url_hash, media_type FROM media WHERE url_hash = $1 LIMIT 1";
    if (isNumeric && (!id || Number.isNaN(id))) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const res = await queryDb(query, [isNumeric ? id : param]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    const row = res.rows[0];

    // 1. S3 Object Storage redirect
    if (row.object_key && row.bucket_name) {
      if (row.visibility === "private") {
        const { getAdminFromRequest } = await import("@/lib/auth");
        const admin = await getAdminFromRequest(req);
        if (!admin) {
          return NextResponse.json(
            { error: "Authentication required to access private media." },
            { status: 401 }
          );
        }
      }

      const s3Url =
        row.visibility === "public"
          ? getPublicUrl(row.object_key, row.bucket_name)
          : await resolveStorageUrl(row.object_key, row.bucket_name, row.visibility || "public");
      return NextResponse.redirect(s3Url, { status: 307 });
    }

    const url = new URL(req.url);
    const shouldDownload = url.searchParams.get("download") === "true";
    const rangeHeader = req.headers.get("range");

    // 2. Direct BYTEA database storage (legacy fallback)
    if (row.data) {
      const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
      const size = buffer.length;
      const mimeType = row.mime_type || "application/octet-stream";
      const filename = row.filename || `media-${row.id}`;
      const disposition = shouldDownload ? "attachment" : "inline";

      if (rangeHeader && size > 0) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

        if (start < size && end >= start) {
          const chunk = buffer.subarray(start, end + 1);
          return new NextResponse(chunk, {
            status: 206,
            headers: {
              "Content-Range": `bytes ${start}-${end}/${size}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunk.length.toString(),
              "Content-Type": mimeType,
              "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"`,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": size.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    // 2. Fallback to external stored URL if available
    if (row.url && !row.url.startsWith("/api/media/")) {
      return NextResponse.redirect(row.url, { status: 307 });
    }

    return NextResponse.json({ error: "Media data unavailable" }, { status: 404 });
  } catch (err: any) {
    console.error("GET /api/media/[id] error:", err);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminPermission(req, "media", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const resolvedParams = await Promise.resolve(params);
    const param = (resolvedParams.id || "").trim();
    if (!param) {
      return NextResponse.json({ error: "Invalid media ID or hash" }, { status: 400 });
    }
    const isNumeric = /^\d+$/.test(param);
    const id = isNumeric ? Number(param) : 0;

    // Fetch item first to delete from S3 if present
    const itemQuery = isNumeric
      ? "SELECT id, object_key, bucket_name FROM media WHERE id = $1 LIMIT 1"
      : "SELECT id, object_key, bucket_name FROM media WHERE url_hash = $1 LIMIT 1";
    const itemRes = await queryDb(itemQuery, [isNumeric ? id : param]);
    if (itemRes.rows.length > 0) {
      const item = itemRes.rows[0];
      if (item.object_key && item.bucket_name) {
        await deleteFromStorage(item.object_key, item.bucket_name).catch(() => {});
      }
    }

    const query = isNumeric
      ? "DELETE FROM media WHERE id = $1 RETURNING id"
      : "DELETE FROM media WHERE url_hash = $1 RETURNING id";
    if (isNumeric && (!id || Number.isNaN(id))) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const deleteRes = await queryDb(query, [isNumeric ? id : param]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deletedId: deleteRes.rows[0].id });
  } catch (err: any) {
    console.error("DELETE /api/media/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
  }
}
