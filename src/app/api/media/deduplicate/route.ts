import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let removedCount = 0;

    // 1. Remove duplicate files by SHA-256 checksum (keep lowest ID)
    const checkDupRes = await queryDb(`
      DELETE FROM media
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY metadata->>'checksum' ORDER BY id ASC) as rnum
          FROM media
          WHERE metadata->>'checksum' IS NOT NULL AND metadata->>'checksum' != ''
        ) t WHERE t.rnum > 1
      )
      RETURNING id;
    `);
    removedCount += checkDupRes.rows.length;

    // 2. Remove duplicate files by identical filename and byte_size (keep lowest ID)
    const sizeNameDupRes = await queryDb(`
      DELETE FROM media
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY filename, byte_size ORDER BY id ASC) as rnum
          FROM media
          WHERE byte_size > 0
        ) t WHERE t.rnum > 1
      )
      RETURNING id;
    `);
    removedCount += sizeNameDupRes.rows.length;

    // 3. Remove dummy test files
    const testDummyRes = await queryDb(`
      DELETE FROM media
      WHERE (filename = 'test.png' AND byte_size = 68)
         OR (filename LIKE 'test-verify%' AND byte_size = 1024)
      RETURNING id;
    `);
    removedCount += testDummyRes.rows.length;

    // 4. Remove broken empty records (no bytea data, no external URL, 0 size)
    const emptyRes = await queryDb(`
      DELETE FROM media
      WHERE data IS NULL
        AND (url IS NULL OR url = '' OR url LIKE '/api/media/%')
        AND (byte_size = 0 OR byte_size IS NULL)
      RETURNING id;
    `);
    removedCount += emptyRes.rows.length;

    return NextResponse.json({
      ok: true,
      removedCount,
      message: `Cleaned up ${removedCount} duplicate/dummy media record(s) successfully!`,
    });
  } catch (err: any) {
    console.error("POST /api/media/deduplicate error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove duplicate media items." },
      { status: 500 }
    );
  }
}
