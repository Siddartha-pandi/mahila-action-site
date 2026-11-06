import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { queryDb, getNextSafeSequenceId } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { formatMediaFilename } from "@/lib/mediaShared";
import {
  uploadToStorage,
  buildObjectKey,
  deleteFromStorage,
  getPublicUrl,
} from "@/lib/storage";

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

const MAX_DIRECT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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
          error: `File size exceeds direct upload limit of 50 MB.`,
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
      `SELECT id, filename, mime_type, byte_size, url, url_hash, thumbnail_url, media_type, metadata, created_at
       FROM media
       WHERE metadata->>'checksum' = $1
          OR (byte_size = $2 AND data = $3)
       ORDER BY id DESC
       LIMIT 1`,
      [checksum, byteSize, buffer]
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
          hashedUrl: row.url_hash ? `/api/media/${row.url_hash}` : localProxyUrl,
          localUrl: localProxyUrl,
          directUrl: row.url || localProxyUrl,
          thumbnailUrl: row.thumbnail_url || localProxyUrl,
          mimeType: row.mime_type,
          byteSize: Number(row.byte_size),
          mediaType: row.media_type,
          metadata: row.metadata,
          createdAt: row.created_at,
        },
        { status: 200 }
      );
    }

    // 2. Determine Next ID safely from PostgreSQL sequence (preventing collisions)
    let nextId = await getNextSafeSequenceId("media", "id");

    const ext = filename.includes(".")
      ? filename.split(".").pop()!.toLowerCase()
      : (mimeType.split("/")[1] || "jpg").replace("+xml", "");

    const effectiveTitle = rawTitle || filename.replace(/\.[^/.]+$/, "");
    let formattedFilename = formatMediaFilename(effectiveTitle, nextId, ext);

    const fileUuid = crypto.randomUUID();
    const objectKey = buildObjectKey(fileUuid, formattedFilename);
    const visibility: "public" | "private" = "public";

    let s3Bucket: string | null = null;
    let s3ObjectKey: string | null = null;
    let s3PublicUrl: string | null = null;
    let isS3 = false;

    // Upload to Neon Object Storage (S3) if configured
    if (process.env.NEON_S3_ENDPOINT && process.env.NEON_S3_ACCESS_KEY_ID) {
      try {
        const uploadResult = await uploadToStorage(buffer, objectKey, mimeType, visibility, {
          uploadedBy: auth.admin?.email || "admin",
          originalName: filename,
          checksum,
        });
        s3Bucket = uploadResult.bucket;
        s3ObjectKey = uploadResult.objectKey;
        s3PublicUrl = uploadResult.publicUrl || getPublicUrl(uploadResult.objectKey, uploadResult.bucket);
        isS3 = true;
      } catch (s3Err: any) {
        console.warn("Neon S3 upload failed, falling back to database binary:", s3Err?.message || s3Err);
      }
    }

    let localProxyUrl = `/api/media/${nextId}`;
    let finalUrl = s3PublicUrl || localProxyUrl;
    let fallbackUrlHash = crypto.createHash("sha256").update(localProxyUrl).digest("hex");
    let metadata = {
      urlHash: fallbackUrlHash,
      checksum,
      title: effectiveTitle,
      originalName: filename,
      uploadedBy: auth.admin?.email || "admin",
      source: isS3 ? "neon_object_storage" : "database_storage",
      bucket: s3Bucket,
      objectKey: s3ObjectKey,
    };

    let dbRes: any;
    try {
      dbRes = await queryDb(
        `INSERT INTO media (id, uuid, filename, mime_type, byte_size, data, object_key, bucket_name, visibility, url, url_hash, thumbnail_url, media_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, url_hash, thumbnail_url, media_type, metadata, created_at`,
        [
          nextId,
          fileUuid,
          formattedFilename,
          mimeType,
          byteSize,
          isS3 ? null : buffer, // Do not store BYTEA if saved in S3
          s3ObjectKey,
          s3Bucket,
          visibility,
          finalUrl,
          fallbackUrlHash,
          finalUrl,
          mediaType,
          JSON.stringify(metadata),
        ]
      );
    } catch (insertErr: any) {
      if (insertErr?.code === "23505" || insertErr?.message?.includes("media_pkey")) {
        console.warn("Retrying media insert with refreshed sequence ID after unique constraint collision...");
        nextId = await getNextSafeSequenceId("media", "id");
        formattedFilename = formatMediaFilename(effectiveTitle, nextId, ext);
        localProxyUrl = `/api/media/${nextId}`;
        finalUrl = s3PublicUrl || localProxyUrl;
        fallbackUrlHash = crypto.createHash("sha256").update(localProxyUrl).digest("hex");
        metadata.urlHash = fallbackUrlHash;
        dbRes = await queryDb(
          `INSERT INTO media (id, uuid, filename, mime_type, byte_size, data, object_key, bucket_name, visibility, url, url_hash, thumbnail_url, media_type, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, url_hash, thumbnail_url, media_type, metadata, created_at`,
          [
            nextId,
            fileUuid,
            formattedFilename,
            mimeType,
            byteSize,
            isS3 ? null : buffer,
            s3ObjectKey,
            s3Bucket,
            visibility,
            finalUrl,
            fallbackUrlHash,
            finalUrl,
            mediaType,
            JSON.stringify(metadata),
          ]
        );
      } else {
        throw insertErr;
      }
    }

    const row = dbRes.rows[0];
    const url = `/api/media/${row.id}`;
    const urlHash = row.url_hash || fallbackUrlHash;

    return NextResponse.json(
      {
        ok: true,
        id: row.id,
        url,
        urlHash,
        hashedUrl: `/api/media/${urlHash}`,
        localUrl: url,
        directUrl: url,
        thumbnailUrl: url,
        filename: row.filename,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        mediaType: row.media_type,
        metadata: row.metadata,
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
      `SELECT id, filename, mime_type, byte_size, url, url_hash, thumbnail_url, media_type, metadata, created_at
       FROM media
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams
    );

    const items = res.rows.map((row: any) => {
      const localUrl = `/api/media/${row.id}`;
      const hashedUrl = row.url_hash ? `/api/media/${row.url_hash}` : localUrl;
      const fileUrl = row.url || localUrl;
      const thumbnailUrl = row.thumbnail_url || (row.mime_type?.startsWith("image/") ? localUrl : null);

      return {
        id: row.id,
        filename: row.filename,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        urlHash: row.url_hash || null,
        hashedUrl,
        url: fileUrl,
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

    // Delete associated S3 objects first if present
    try {
      const s3Items = await queryDb(
        "SELECT object_key, bucket_name FROM media WHERE id = ANY($1::int[]) AND object_key IS NOT NULL",
        [ids]
      );
      for (const item of s3Items.rows) {
        if (item.object_key && item.bucket_name) {
          await deleteFromStorage(item.object_key, item.bucket_name).catch(() => {});
        }
      }
    } catch (s3Err) {
      console.warn("Error deleting objects from S3:", s3Err);
    }

    const deleteRes = await queryDb("DELETE FROM media WHERE id = ANY($1::int[]) RETURNING id", [ids]);

    return NextResponse.json({
      ok: true,
      deletedCount: deleteRes.rows.length,
      deletedIds: deleteRes.rows.map((r: any) => r.id),
    });
  } catch (err: any) {
    console.error("DELETE /api/media error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete media items" },
      { status: 500 }
    );
  }
}
