/**
 * POST /api/storage/presign
 *
 * Generates a presigned PUT URL for direct browser-to-S3 uploads of large files.
 * After the client uploads directly to S3, they call POST /api/storage/presign/confirm
 * to register the metadata in PostgreSQL.
 *
 * Authentication: requires admin role with media edit permission.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createPresignedUploadUrl,
  buildObjectKey,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/storage";
import { verifyAdminPermission } from "@/lib/auth";
import { queryDb, getNextSafeSequenceId, initDb } from "@/lib/db";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// ── POST /api/storage/presign — Request a presigned upload URL ────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 403 });
  }

  try {
    const body = await req.json();
    const { filename, mimeType: rawMime, fileSize, visibility = "public", title = "" } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    let mimeType = (rawMime || "").toLowerCase();
    if (mimeType === "image/jpg") mimeType = "image/jpeg";

    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF, AVIF, BMP.` },
        { status: 400 }
      );
    }

    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility. Must be 'public' or 'private'." },
        { status: 400 }
      );
    }

    if (typeof fileSize === "number" && fileSize > MAX_IMAGE_SIZE_BYTES) {
      const maxMb = Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024);
      return NextResponse.json(
        { error: `File exceeds the ${maxMb} MB size limit.` },
        { status: 413 }
      );
    }

    // Generate UUID and object key
    const fileUuid = crypto.randomUUID();
    const ext = filename.includes(".")
      ? filename.split(".").pop()!.toLowerCase()
      : mimeType.split("/")[1] || "jpg";

    const effectiveTitle = (title || filename).replace(/\.[^/.]+$/, "");
    const storageFilename = `${effectiveTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50)}-${fileUuid.slice(0, 8)}.${ext}`;

    const objectKey = buildObjectKey(fileUuid, storageFilename);

    // Create presigned upload URL (15-minute expiry)
    const presigned = await createPresignedUploadUrl(objectKey, mimeType, visibility as "public" | "private", 900);

    // Reserve a DB ID now so we know the final record ID before upload completes
    await initDb();
    const reservedId = await getNextSafeSequenceId("media", "id");

    return NextResponse.json({
      ok: true,
      uploadUrl: presigned.uploadUrl,
      objectKey,
      bucket: presigned.bucket,
      uuid: fileUuid,
      reservedId,
      storageFilename,
      expiresAt: presigned.expiresAt,
    });
  } catch (err: any) {
    console.error("POST /api/storage/presign error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/storage/presign — Confirm a presigned upload ──────────────────
// Called after the client has successfully PUT the file to S3
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 403 });
  }

  try {
    const body = await req.json();
    const {
      reservedId,
      uuid,
      objectKey,
      bucket,
      storageFilename,
      mimeType: rawMime,
      fileSize,
      visibility = "public",
      title = "",
    } = body;

    if (!objectKey || !bucket || !uuid || !reservedId) {
      return NextResponse.json(
        { error: "Missing required fields: objectKey, bucket, uuid, reservedId" },
        { status: 400 }
      );
    }

    let mimeType = (rawMime || "image/jpeg").toLowerCase();
    if (mimeType === "image/jpg") mimeType = "image/jpeg";

    const effectiveTitle = title || storageFilename?.replace(/\.[^/.]+$/, "") || "image";
    const urlHash = crypto.createHash("sha256").update(objectKey).digest("hex");

    const { getPublicUrl } = await import("@/lib/storage");
    const resolvedUrl =
      visibility === "public"
        ? getPublicUrl(objectKey, bucket)
        : `/api/storage/${reservedId}`;

    const metadata = {
      title: effectiveTitle,
      uploadedBy: auth.admin?.email || "admin",
      source: "neon_object_storage_presigned",
      uuid,
    };

    let dbRes: any;
    try {
      dbRes = await queryDb(
        `INSERT INTO media (
          id, uuid, filename, mime_type, byte_size,
          object_key, bucket_name, visibility,
          url, url_hash, thumbnail_url, media_type, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
          uuid = EXCLUDED.uuid,
          filename = EXCLUDED.filename,
          mime_type = EXCLUDED.mime_type,
          byte_size = EXCLUDED.byte_size,
          object_key = EXCLUDED.object_key,
          bucket_name = EXCLUDED.bucket_name,
          visibility = EXCLUDED.visibility,
          url = EXCLUDED.url,
          url_hash = EXCLUDED.url_hash,
          thumbnail_url = EXCLUDED.thumbnail_url,
          media_type = EXCLUDED.media_type,
          metadata = EXCLUDED.metadata
        RETURNING id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, media_type, created_at`,
        [
          reservedId,
          uuid,
          storageFilename || `image-${uuid.slice(0, 8)}.jpg`,
          mimeType,
          fileSize || 0,
          objectKey,
          bucket,
          visibility,
          resolvedUrl,
          urlHash,
          resolvedUrl,
          "image",
          JSON.stringify(metadata),
        ]
      );
    } catch (insertErr: any) {
      if (insertErr?.code === "23505") {
        const retryId = await getNextSafeSequenceId("media", "id");
        const retryUrl =
          visibility === "public"
            ? getPublicUrl(objectKey, bucket)
            : `/api/storage/${retryId}`;
        dbRes = await queryDb(
          `INSERT INTO media (
            id, uuid, filename, mime_type, byte_size,
            object_key, bucket_name, visibility,
            url, url_hash, thumbnail_url, media_type, metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, media_type, created_at`,
          [
            retryId,
            uuid,
            storageFilename || `image-${uuid.slice(0, 8)}.jpg`,
            mimeType,
            fileSize || 0,
            objectKey,
            bucket,
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
    console.error("PATCH /api/storage/presign error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to confirm upload" },
      { status: 500 }
    );
  }
}
