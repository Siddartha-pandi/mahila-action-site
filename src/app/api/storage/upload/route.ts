/**
 * POST /api/storage/upload
 *
 * Direct multipart upload for images up to MAX_IMAGE_SIZE_BYTES.
 * For files larger than PRESIGN_UPLOAD_THRESHOLD_BYTES, use the presign route instead.
 *
 * Authentication: requires admin role with media edit permission.
 * Never exposes S3 credentials to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { queryDb, getNextSafeSequenceId, initDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import {
  uploadToStorage,
  validateFileSignature,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  PRESIGN_UPLOAD_THRESHOLD_BYTES,
  buildObjectKey,
  getPublicUrl,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
// Increase body size limit for direct uploads
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ── Authorization ──────────────────────────────────────────────────────────
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 403 });
  }

  try {
    await initDb();

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 415 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const visibility = (formData.get("visibility") as string | null) || "public";
    const title = ((formData.get("title") as string | null) || "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility. Must be 'public' or 'private'." },
        { status: 400 }
      );
    }

    // ── MIME type validation ───────────────────────────────────────────────
    let mimeType = (file.type || "").toLowerCase();
    if (mimeType === "image/jpg") mimeType = "image/jpeg";

    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF, AVIF, BMP.`,
        },
        { status: 400 }
      );
    }

    // ── Size validation ────────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty file received" }, { status: 400 });
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      const maxMb = Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024);
      return NextResponse.json(
        {
          error: `File exceeds the ${maxMb} MB size limit. Use the presigned upload endpoint for larger files.`,
        },
        { status: 413 }
      );
    }

    // For large-ish files, suggest presigned upload (but still allow here)
    if (buffer.length > PRESIGN_UPLOAD_THRESHOLD_BYTES) {
      // Allow the upload but add a header hint
    }

    // ── File signature validation ──────────────────────────────────────────
    if (!validateFileSignature(buffer, mimeType)) {
      return NextResponse.json(
        {
          error:
            "File content does not match the declared MIME type. Possible file corruption or spoofing attempt.",
        },
        { status: 422 }
      );
    }

    // ── Duplicate check via SHA-256 checksum ──────────────────────────────
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    const existing = await queryDb(
      `SELECT id, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, media_type, created_at
       FROM media
       WHERE metadata->>'checksum' = $1 AND object_key IS NOT NULL
       ORDER BY id DESC LIMIT 1`,
      [checksum]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          message: `Reused existing image: "${row.filename}"`,
          id: row.id,
          filename: row.filename,
          url: row.url,
          visibility: row.visibility,
          mimeType: row.mime_type,
          byteSize: Number(row.byte_size),
        },
        { status: 200 }
      );
    }

    // ── Build object key & upload ──────────────────────────────────────────
    const fileUuid = crypto.randomUUID();
    const originalFilename = file.name || "upload.jpg";
    const ext = originalFilename.includes(".")
      ? originalFilename.split(".").pop()!.toLowerCase()
      : mimeType.split("/")[1].replace("+xml", "");

    const effectiveTitle = title || originalFilename.replace(/\.[^/.]+$/, "");
    const storageFilename = `${effectiveTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50)}-${fileUuid.slice(0, 8)}.${ext}`;

    const objectKey = buildObjectKey(fileUuid, storageFilename);

    const uploadResult = await uploadToStorage(
      buffer,
      objectKey,
      mimeType,
      visibility as "public" | "private",
      {
        uploadedBy: auth.admin?.email || "admin",
        originalName: originalFilename,
        checksum,
      }
    );

    // ── Save metadata to PostgreSQL ────────────────────────────────────────
    const nextId = await getNextSafeSequenceId("media", "id");
    const urlHash = crypto.createHash("sha256").update(objectKey).digest("hex");
    const resolvedUrl = uploadResult.publicUrl || `/api/storage/${nextId}`;

    const metadata = {
      checksum,
      title: effectiveTitle,
      originalName: originalFilename,
      uploadedBy: auth.admin?.email || "admin",
      source: "neon_object_storage",
      etag: uploadResult.etag,
    };

    let dbRes: any;
    try {
      dbRes = await queryDb(
        `INSERT INTO media (
          id, uuid, filename, mime_type, byte_size,
          object_key, bucket_name, visibility,
          url, url_hash, thumbnail_url, media_type, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, media_type, created_at`,
        [
          nextId,
          fileUuid,
          storageFilename,
          mimeType,
          buffer.length,
          objectKey,
          uploadResult.bucket,
          visibility,
          resolvedUrl,
          urlHash,
          resolvedUrl,
          "image",
          JSON.stringify(metadata),
        ]
      );
    } catch (insertErr: any) {
      // Handle sequence collision by retrying once
      if (insertErr?.code === "23505") {
        const retryId = await getNextSafeSequenceId("media", "id");
        const retryUrl = uploadResult.publicUrl || `/api/storage/${retryId}`;
        dbRes = await queryDb(
          `INSERT INTO media (
            id, uuid, filename, mime_type, byte_size,
            object_key, bucket_name, visibility,
            url, url_hash, thumbnail_url, media_type, metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, media_type, created_at`,
          [
            retryId,
            fileUuid,
            storageFilename,
            mimeType,
            buffer.length,
            objectKey,
            uploadResult.bucket,
            visibility,
            retryUrl,
            urlHash,
            retryUrl,
            "image",
            JSON.stringify(metadata),
          ]
        );
      } else {
        throw insertErr;
      }
    }

    const row = dbRes.rows[0];

    return NextResponse.json(
      {
        ok: true,
        id: row.id,
        uuid: row.uuid,
        filename: row.filename,
        url: row.url,
        visibility: row.visibility,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        objectKey: row.object_key,
        bucket: row.bucket_name,
        mediaType: row.media_type,
        createdAt: row.created_at,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/storage/upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
