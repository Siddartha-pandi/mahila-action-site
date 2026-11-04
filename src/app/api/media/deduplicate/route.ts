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

    // 1. Remove duplicate files by drive_file_id (keep lowest ID)
    const driveDupRes = await queryDb(`
      DELETE FROM media
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY drive_file_id ORDER BY id ASC) as rnum
          FROM media
          WHERE drive_file_id IS NOT NULL AND drive_file_id != ''
        ) t WHERE t.rnum > 1
      )
      RETURNING id;
    `);
    removedCount += driveDupRes.rows.length;

    // 2. Remove duplicate files by SHA-256 checksum (keep lowest ID)
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

    // 3. Remove duplicate files by identical filename and byte_size
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

    // 4. Remove dummy 68-byte test.png files
    const testDummyRes = await queryDb(`
      DELETE FROM media
      WHERE (filename = 'test.png' AND byte_size = 68)
         OR (filename LIKE 'test-verify%' AND byte_size = 1024)
      RETURNING id;
    `);
    removedCount += testDummyRes.rows.length;

    // 5. Remove broken empty records (no Drive ID, no bytea data, no external URL, 0 size)
    const emptyRes = await queryDb(`
      DELETE FROM media
      WHERE (drive_file_id IS NULL OR drive_file_id = '')
        AND data IS NULL
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

