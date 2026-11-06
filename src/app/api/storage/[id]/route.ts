/**
 * GET    /api/storage/[id]  — Retrieve image URL (or redirect for public, presigned for private)
 * DELETE /api/storage/[id]  — Delete image from S3 AND PostgreSQL (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { queryDb, initDb } from "@/lib/db";
import { getAdminFromRequest, verifyAdminPermission } from "@/lib/auth";
import {
  createPresignedDownloadUrl,
  getPublicUrl,
  deleteFromStorage,
  PRESIGN_URL_EXPIRES_SECONDS,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

// ── GET /api/storage/[id] ─────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = Number(id);

  if (!mediaId || isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  try {
    await initDb();

    const res = await queryDb(
      `SELECT id, uuid, filename, mime_type, object_key, bucket_name, visibility, url, media_type, created_at
       FROM media
       WHERE id = $1 AND object_key IS NOT NULL`,
      [mediaId],
      { noCache: true }
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const row = res.rows[0];

    // Private images require authentication
    if (row.visibility === "private") {
      const admin = await getAdminFromRequest(req);
      if (!admin) {
        return NextResponse.json(
          { error: "Authentication required to access this image." },
          { status: 401 }
        );
      }
    }

    let imageUrl: string;

    if (row.visibility === "public") {
      imageUrl = getPublicUrl(row.object_key, row.bucket_name);
    } else {
      imageUrl = await createPresignedDownloadUrl(
        row.object_key,
        row.bucket_name,
        PRESIGN_URL_EXPIRES_SECONDS
      );
    }

    // For public images: redirect to the CDN URL
    // For private images: return JSON with the presigned URL (clients must use it directly)
    if (row.visibility === "public") {
      return NextResponse.redirect(imageUrl, { status: 302 });
    }

    return NextResponse.json({
      ok: true,
      id: row.id,
      uuid: row.uuid,
      filename: row.filename,
      mimeType: row.mime_type,
      visibility: row.visibility,
      url: imageUrl,
      expiresIn: PRESIGN_URL_EXPIRES_SECONDS,
    });
  } catch (err: any) {
    console.error(`GET /api/storage/${id} error:`, err);
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve image" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/storage/[id] ──────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = Number(id);

  if (!mediaId || isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  // Require admin with media delete permission
  const auth = await verifyAdminPermission(req, "media", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 403 });
  }

  try {
    await initDb();

    // 1. Fetch the row to get object_key and bucket
    const res = await queryDb(
      `SELECT id, object_key, bucket_name, filename, visibility
       FROM media
       WHERE id = $1`,
      [mediaId],
      { noCache: true }
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const row = res.rows[0];

    // 2. Delete from S3 (if it was an S3-backed object)
    if (row.object_key && row.bucket_name) {
      try {
        await deleteFromStorage(row.object_key, row.bucket_name);
      } catch (s3Err: any) {
        // Log but don't fail — still remove the DB record
        console.error(
          `Warning: Failed to delete S3 object ${row.object_key} from ${row.bucket_name}:`,
          s3Err?.message
        );
      }
    }

    // 3. Delete from PostgreSQL
    await queryDb("DELETE FROM media WHERE id = $1", [mediaId]);

    return NextResponse.json({
      ok: true,
      message: `Image "${row.filename}" deleted successfully.`,
      id: mediaId,
    });
  } catch (err: any) {
    console.error(`DELETE /api/storage/${id} error:`, err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/storage/[id] — Update visibility ───────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = Number(id);

  if (!mediaId || isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 403 });
  }

  try {
    const body = await req.json();
    const { visibility } = body;

    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility. Must be 'public' or 'private'." },
        { status: 400 }
      );
    }

    await initDb();

    const res = await queryDb(
      `UPDATE media SET visibility = $1 WHERE id = $2 AND object_key IS NOT NULL
       RETURNING id, visibility, filename`,
      [visibility, mediaId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Image not found or is not an S3-backed image." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: res.rows[0].id,
      visibility: res.rows[0].visibility,
      filename: res.rows[0].filename,
    });
  } catch (err: any) {
    console.error(`PATCH /api/storage/${id} error:`, err);
    return NextResponse.json(
      { error: err?.message || "Failed to update image" },
      { status: 500 }
    );
  }
}

