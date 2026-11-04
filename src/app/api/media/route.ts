import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { formatMediaFilename } from "@/lib/mediaShared";
import {
  isGoogleDriveConfigured,
  uploadFileToDrive,
  deleteFileFromDrive,
  getDriveDirectUrl,
  getDriveThumbnailUrl,
} from "@/lib/googleDrive";
import { syncGoogleDriveMedia } from "@/lib/googleDriveSync";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  // Videos
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  // Documents / PDFs
  "application/pdf",
]);

const MAX_DIRECT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (use /api/media/upload/resumable for larger files)

function getMediaTypeFromMime(mimeType: string): "image" | "video" | "pdf" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "document";
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/);
  if (!match) return null;
  let mimeType = match[1].toLowerCase().trim();
  if (mimeType === "image/jpg") mimeType = "image/jpeg";
  const cleanBase64 = match[2].trim().replace(/\s/g, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  return { buffer, mimeType };
}

export async function POST(req: NextRequest) {
  // Support permissions for "media" or fallback to "events"
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let filename = "upload";
    let rawTitle = "";
    let mimeType = "image/jpeg";
    let buffer: Buffer | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }

      filename = file.name || "upload";
      rawTitle = ((formData.get("title") as string) || "").trim();
      mimeType = (file.type || "application/octet-stream").toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload (e.g. { dataUrl: "data:image/png;base64,...", filename?: "crop.png", title?: "..." })
      const body = await req.json();
      if (!body.dataUrl || typeof body.dataUrl !== "string") {
        return NextResponse.json({ error: "Missing dataUrl in request body" }, { status: 400 });
      }

      const parsed = parseDataUrl(body.dataUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid base64 data URL format" }, { status: 400 });
      }

      buffer = parsed.buffer;
      mimeType = parsed.mimeType;
      filename = body.filename || `image-${Date.now()}.${mimeType.split("/")[1] || "png"}`;
      rawTitle = (body.title || "").trim();
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: "Empty file received" }, { status: 400 });
    }

    if (buffer.length > MAX_DIRECT_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds direct upload limit of 50 MB. For large videos, use the resumable upload endpoint.`,
        },
        { status: 400 }
      );
    }

    if (mimeType === "image/jpg") mimeType = "image/jpeg";

    // Auto-detect MIME type from filename extension if generic
    if (mimeType === "application/octet-stream" || !ALLOWED_MIME_TYPES.has(mimeType)) {
      const lowerName = filename.toLowerCase();
      if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (lowerName.endsWith(".png")) mimeType = "image/png";
      else if (lowerName.endsWith(".webp")) mimeType = "image/webp";
      else if (lowerName.endsWith(".gif")) mimeType = "image/gif";
      else if (lowerName.endsWith(".svg")) mimeType = "image/svg+xml";
      else if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
      else if (lowerName.endsWith(".mp4")) mimeType = "video/mp4";
      else if (lowerName.endsWith(".webm")) mimeType = "video/webm";
      else if (lowerName.endsWith(".mov")) mimeType = "video/quicktime";
      else if (lowerName.endsWith(".mkv")) mimeType = "video/x-matroska";
      else {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${mimeType}. Allowed formats: Images (JPEG, PNG, WebP, GIF, SVG), Videos (MP4, WebM, MOV), and PDFs.`,
          },
          { status: 400 }
        );
      }
    }

    const byteSize = buffer.length;
    const mediaType = getMediaTypeFromMime(mimeType);

    // Compute cryptographic SHA-256 checksum to prevent duplicate image uploads
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // 1. DUPLICATE CHECK: If exact file already exists, reuse it without duplicate upload
    const existingRes = await queryDb(
      `SELECT id, filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata, created_at
       FROM media
       WHERE metadata->>'checksum' = $1
          OR (byte_size = $2 AND (data = $3 OR (drive_file_id IS NOT NULL AND filename = $4)))
       ORDER BY id DESC
       LIMIT 1`,
      [checksum, byteSize, buffer, filename]
    );

    if (existingRes.rows.length > 0) {
      const row = existingRes.rows[0];
      const localProxyUrl = `/api/media/${row.id}`;
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          message: `Duplicate prevented: Reused existing media "${row.filename}"`,
          id: row.id,
          filename: row.filename,
          url: row.url || localProxyUrl,
          localUrl: localProxyUrl,
          directUrl: row.url || localProxyUrl,
          thumbnailUrl: row.thumbnail_url || localProxyUrl,
          driveFileId: row.drive_file_id,
          mimeType: row.mime_type,
          byteSize: Number(row.byte_size),
          mediaType: row.media_type,
          metadata: row.metadata,
          createdAt: row.created_at,
        },
        { status: 200 }
      );
    }

    // 2. Determine Next ID from PostgreSQL sequence
    let nextId: number;
    try {
      const seqRes = await queryDb("SELECT nextval(pg_get_serial_sequence('media', 'id')) as next_id");
      nextId = Number(seqRes.rows[0]?.next_id);
    } catch {
      const maxRes = await queryDb("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM media");
      nextId = Number(maxRes.rows[0]?.next_id);
    }

    // Determine extension and title for naming: <title>-<id>.<ext>
    const ext = filename.includes(".")
      ? filename.split(".").pop()!.toLowerCase()
      : (mimeType.split("/")[1] || "jpg").replace("+xml", "");

    const effectiveTitle = rawTitle || filename.replace(/\.[^/.]+$/, "");
    const formattedFilename = formatMediaFilename(effectiveTitle, nextId, ext);

    // Upload to Google Drive if credentials exist
    if (isGoogleDriveConfigured()) {
      try {
        const driveResult = await uploadFileToDrive({
          buffer,
          filename: formattedFilename,
          mimeType,
        });

        const metadata = {
          driveFileId: driveResult.id,
          webViewLink: driveResult.webViewLink,
          webContentLink: driveResult.webContentLink,
          uploadedBy: auth.admin?.email || "admin",
          source: "admin_upload",
          checksum,
          title: effectiveTitle,
          originalName: filename,
        };

        // Store file ID, URLs, formatted filename, MIME type, size, and metadata in PostgreSQL
        const dbRes = await queryDb(
          `INSERT INTO media (id, filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata, created_at`,
          [
            nextId,
            formattedFilename,
            mimeType,
            byteSize,
            driveResult.id,
            driveResult.directUrl,
            driveResult.thumbnailUrl,
            mediaType,
            JSON.stringify(metadata),
          ]
        );

        const row = dbRes.rows[0];
        const localProxyUrl = `/api/media/${row.id}`;

        return NextResponse.json(
          {
            ok: true,
            id: row.id,
            url: row.url || localProxyUrl,
            localUrl: localProxyUrl,
            directUrl: driveResult.directUrl,
            thumbnailUrl: row.thumbnail_url,
            driveFileId: row.drive_file_id,
            filename: row.filename,
            mimeType: row.mime_type,
            byteSize: Number(row.byte_size),
            mediaType: row.media_type,
            metadata: row.metadata,
            createdAt: row.created_at,
          },
          { status: 201 }
        );
      } catch (driveErr: any) {
        console.error("Google Drive upload failed, falling back to local database storage:", driveErr);
      }
    }

    // Fallback: store directly in PostgreSQL database if Google Drive is not configured
    const metadataFallback = {
      checksum,
      title: effectiveTitle,
      originalName: filename,
      source: "db_fallback",
    };

    const dbRes = await queryDb(
      `INSERT INTO media (id, filename, mime_type, byte_size, data, media_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, filename, mime_type, byte_size, media_type, created_at`,
      [nextId, formattedFilename, mimeType, byteSize, buffer, mediaType, JSON.stringify(metadataFallback)]
    );

    const row = dbRes.rows[0];
    const url = `/api/media/${row.id}`;

    await queryDb(`UPDATE media SET url = $1 WHERE id = $2`, [url, row.id]);

    return NextResponse.json(
      {
        ok: true,
        id: row.id,
        url,
        filename: row.filename,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        mediaType: row.media_type,
        createdAt: row.created_at,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/media error:", err);
    return NextResponse.json({ error: err.message || "Failed to store media" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // Optional Google Drive auto-sync (throttled to 10s cooldown)
    if (url.searchParams.get("sync") === "auto" || url.searchParams.get("autoSync") === "true") {
      try {
        await syncGoogleDriveMedia();
      } catch (syncErr) {
        console.warn("Background auto-sync in GET /api/media:", syncErr);
      }
    }
    const rawLimit = Number(url.searchParams.get("limit"));
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const rawOffset = Number(url.searchParams.get("offset"));
    const offset = !isNaN(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const typeFilter = url.searchParams.get("type"); // 'image' | 'video' | 'pdf' | 'all'
    const searchQuery = url.searchParams.get("q")?.trim() || "";

    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (typeFilter && typeFilter !== "all") {
      queryParams.push(typeFilter);
      whereClauses.push(`media_type = $${queryParams.length}`);
    }

    if (searchQuery) {
      queryParams.push(`%${searchQuery}%`);
      whereClauses.push(`filename ILIKE $${queryParams.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Count total
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM media ${whereSql}`,
      queryParams
    );
    const total = countRes.rows[0]?.total || 0;

    // Fetch items with limit & offset
    queryParams.push(limit);
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const res = await queryDb(
      `SELECT id, filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata, created_at
       FROM media
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams
    );

    const items = res.rows.map((row: any) => {
      const localUrl = `/api/media/${row.id}`;
      const isTransparentFormat =
        row.mime_type === "image/png" ||
        row.mime_type === "image/svg+xml" ||
        row.mime_type === "image/webp";

      const directUrl = row.drive_file_id
        ? getDriveDirectUrl(row.drive_file_id, row.mime_type)
        : row.url || localUrl;

      // Note: Google Drive's /thumbnail API flattens transparent PNGs to solid black.
      // Use directUrl for transparent formats so transparent backgrounds stay clean.
      const thumbnailUrl = row.drive_file_id
        ? (isTransparentFormat ? directUrl : getDriveThumbnailUrl(row.drive_file_id))
        : row.thumbnail_url || (row.mime_type?.startsWith("image/") ? localUrl : null);

      return {
        id: row.id,
        filename: row.filename,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        driveFileId: row.drive_file_id,
        url: directUrl,
        localUrl,
        thumbnailUrl,
        mediaType: row.media_type || getMediaTypeFromMime(row.mime_type),
        metadata: row.metadata || {},
        createdAt: row.created_at,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        items,
        total,
        limit,
        offset,
        driveConfigured: isGoogleDriveConfigured(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/media error:", err);
    return NextResponse.json({ error: "Failed to list media items" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const ids: number[] = Array.isArray(body?.ids)
      ? body.ids.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No media IDs provided" }, { status: 400 });
    }

    const selectRes = await queryDb(
      "SELECT id, filename, drive_file_id FROM media WHERE id = ANY($1::int[])",
      [ids]
    );

    for (const row of selectRes.rows) {
      if (row.drive_file_id) {
        try {
          await deleteFileFromDrive(row.drive_file_id);
        } catch (driveErr) {
          console.warn(`Could not delete file ${row.drive_file_id} from Google Drive:`, driveErr);
        }
      }
    }

    await queryDb("DELETE FROM media WHERE id = ANY($1::int[])", [ids]);

    return NextResponse.json({
      ok: true,
      deletedCount: selectRes.rows.length,
      deletedIds: ids,
    });
  } catch (err: any) {
    console.error("DELETE /api/media error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete media items" },
      { status: 500 }
    );
  }
}
