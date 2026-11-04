import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import {
  deleteFileFromDrive,
  getFileStreamFromDrive,
  getDriveDirectUrl,
} from "@/lib/googleDrive";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = Number(resolvedParams.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const res = await queryDb(
      "SELECT id, filename, mime_type, byte_size, drive_file_id, url, data, media_type FROM media WHERE id = $1 LIMIT 1",
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    const row = res.rows[0];
    const url = new URL(req.url);
    const shouldDownload = url.searchParams.get("download") === "true";
    const rangeHeader = req.headers.get("range");

    // 1. Google Drive storage handling - stream directly from Drive for maximum reliability
    if (row.drive_file_id) {
      try {
        const { stream, mimeType, size } = await getFileStreamFromDrive(
          row.drive_file_id,
          rangeHeader || undefined
        );

        // Convert Node stream to web ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
        });

        const headers: Record<string, string> = {
          "Content-Type": mimeType || row.mime_type || "application/octet-stream",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(
            row.filename || `media-${id}`
          )}"`,
        };

        if (rangeHeader && size > 0) {
          // Parse range
          const parts = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
          headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
          headers["Content-Length"] = (end - start + 1).toString();

          return new NextResponse(webStream as any, {
            status: 206,
            headers,
          });
        }

        if (size > 0) {
          headers["Content-Length"] = size.toString();
        }

        return new NextResponse(webStream as any, {
          status: 200,
          headers,
        });
      } catch (streamErr) {
        console.warn("Direct stream from Drive failed, falling back to public CDN redirect:", streamErr);
        const directUrl = getDriveDirectUrl(row.drive_file_id, row.mime_type);
        return NextResponse.redirect(directUrl, { status: 307 });
      }
    }

    // 2. Legacy BYTEA storage fallback (for older items)
    if (row.data) {
      const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": row.mime_type || "image/jpeg",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(
            row.filename || `media-${id}`
          )}"`,
        },
      });
    }

    // 3. Fallback to stored URL if available
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
    const id = Number(resolvedParams.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    // Fetch drive_file_id before deletion
    const selectRes = await queryDb(
      "SELECT id, filename, drive_file_id FROM media WHERE id = $1 LIMIT 1",
      [id]
    );

    if (selectRes.rows.length === 0) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    const item = selectRes.rows[0];

    // Delete from Google Drive if drive_file_id exists
    if (item.drive_file_id) {
      try {
        await deleteFileFromDrive(item.drive_file_id);
      } catch (driveErr) {
        console.warn(`Could not delete file ${item.drive_file_id} from Google Drive:`, driveErr);
      }
    }

    // Delete from PostgreSQL
    await queryDb("DELETE FROM media WHERE id = $1", [id]);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err: any) {
    console.error("DELETE /api/media/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
  }
}
