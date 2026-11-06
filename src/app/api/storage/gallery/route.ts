/**
 * GET  /api/storage/gallery  — Paginated image listing (public + private with auth)
 *
 * Query params:
 *   visibility  'public' | 'private' | 'all'  (default: 'public')
 *   page        page number (1-based, default: 1)
 *   limit       items per page (default: 24, max: 100)
 *   q           search by filename
 *
 * Public images can be listed without auth.
 * Private images require admin auth with media view permission.
 */

import { NextRequest, NextResponse } from "next/server";
import { queryDb, initDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import {
  resolveStorageUrl,
  getPublicUrl,
  PRESIGN_URL_EXPIRES_SECONDS,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();

    const url = new URL(req.url);
    const rawVisibility = url.searchParams.get("visibility") || "public";
    const rawPage = Number(url.searchParams.get("page")) || 1;
    const rawLimit = Number(url.searchParams.get("limit")) || 24;
    const searchQuery = url.searchParams.get("q")?.trim() || "";

    const page = Math.max(1, rawPage);
    const limit = Math.min(100, Math.max(1, rawLimit));
    const offset = (page - 1) * limit;

    // Validate visibility param
    const visibility = ["public", "private", "all"].includes(rawVisibility)
      ? rawVisibility
      : "public";

    // Private or 'all' requests require authentication
    if (visibility !== "public") {
      const admin = await getAdminFromRequest(req);
      if (!admin) {
        return NextResponse.json(
          { error: "Authentication required to view private images." },
          { status: 401 }
        );
      }
    }

    // Build WHERE clauses
    const whereClauses: string[] = ["object_key IS NOT NULL", "media_type = 'image'"];
    const params: any[] = [];

    if (visibility === "public") {
      params.push("public");
      whereClauses.push(`visibility = $${params.length}`);
    } else if (visibility === "private") {
      params.push("private");
      whereClauses.push(`visibility = $${params.length}`);
    }
    // 'all' = no visibility filter

    if (searchQuery) {
      params.push(`%${searchQuery}%`);
      whereClauses.push(`filename ILIKE $${params.length}`);
    }

    const whereSQL = `WHERE ${whereClauses.join(" AND ")}`;

    // Count total
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM media ${whereSQL}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    // Fetch items
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const res = await queryDb(
      `SELECT
         id, uuid, filename, mime_type, byte_size,
         object_key, bucket_name, visibility, url, thumbnail_url,
         media_type, metadata, created_at
       FROM media
       ${whereSQL}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
      { noCache: true }
    );

    // Resolve URLs — private images get presigned URLs
    const items = await Promise.all(
      res.rows.map(async (row: any) => {
        let resolvedUrl = row.url;
        let thumbnailUrl = row.thumbnail_url;

        if (row.object_key && row.bucket_name) {
          if (row.visibility === "public") {
            resolvedUrl = getPublicUrl(row.object_key, row.bucket_name);
          } else {
            // Private: generate presigned URL
            try {
              const { createPresignedDownloadUrl } = await import("@/lib/storage");
              resolvedUrl = await createPresignedDownloadUrl(
                row.object_key,
                row.bucket_name,
                PRESIGN_URL_EXPIRES_SECONDS
              );
            } catch {
              resolvedUrl = `/api/storage/${row.id}`;
            }
          }
          thumbnailUrl = resolvedUrl;
        }

        return {
          id: row.id,
          uuid: row.uuid,
          filename: row.filename,
          mimeType: row.mime_type,
          byteSize: Number(row.byte_size),
          objectKey: row.object_key,
          bucket: row.bucket_name,
          visibility: row.visibility,
          url: resolvedUrl,
          thumbnailUrl,
          mediaType: row.media_type,
          metadata: row.metadata || {},
          createdAt: row.created_at,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        ok: true,
        items,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/storage/gallery error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to list gallery images" },
      { status: 500 }
    );
  }
}

