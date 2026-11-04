import { queryDb, initDb } from "../lib/db";
import {
  isGoogleDriveConfigured,
  getDriveDirectUrl,
  getDriveThumbnailUrl,
} from "../lib/googleDrive";
import { auth } from "../auth";
import dotenv from "dotenv";

dotenv.config();

async function runTests() {
  console.log("==================================================");
  console.log("  Running Google Drive Media Storage Tests");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Test Google Drive URL generators
  console.log("--- 1. Google Drive Helpers ---");
  const testFileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2eZ";
  const imgUrl = getDriveDirectUrl(testFileId, "image/jpeg");
  assert(
    imgUrl === `https://lh3.googleusercontent.com/d/${testFileId}`,
    `Direct image CDN URL matches Google UserContent format (${imgUrl})`
  );

  const thumbUrl = getDriveThumbnailUrl(testFileId, 400);
  assert(
    thumbUrl === `https://drive.google.com/thumbnail?id=${testFileId}&sz=w400`,
    `Thumbnail URL format generated correctly (${thumbUrl})`
  );

  const isDriveSet = isGoogleDriveConfigured();
  console.log(`ℹ Google Drive OAuth configured: ${isDriveSet}`);

  // 2. Test Database Schema & Media Table
  console.log("\n--- 2. PostgreSQL Media Table & Migrations ---");
  try {
    await initDb();
    const columnsRes = await queryDb(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'media'`
    );

    const cols = columnsRes.rows.map((r: any) => r.column_name);
    console.log("Detected media columns:", cols.join(", "));

    assert(cols.includes("id"), "media table has 'id' column");
    assert(cols.includes("filename"), "media table has 'filename' column");
    assert(cols.includes("mime_type"), "media table has 'mime_type' column");
    assert(cols.includes("byte_size"), "media table has 'byte_size' column");
    assert(cols.includes("drive_file_id"), "media table has 'drive_file_id' column");
    assert(cols.includes("url"), "media table has 'url' column");
    assert(cols.includes("media_type"), "media table has 'media_type' column");
    assert(cols.includes("metadata"), "media table has 'metadata' column");

    const dataCol = columnsRes.rows.find((r: any) => r.column_name === "data");
    if (dataCol) {
      assert(dataCol.is_nullable === "YES", "media.data column is nullable (safe for cloud storage)");
    }

    // 3. Test CRUD on media table
    console.log("\n--- 3. PostgreSQL Media CRUD Verification ---");
    const testFilename = `test-verify-${Date.now()}.png`;
    const insertRes = await queryDb(
      `INSERT INTO media (filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, filename, mime_type, byte_size, drive_file_id, url, media_type`,
      [
        testFilename,
        "image/png",
        1024,
        "test_drive_file_id_12345",
        "https://lh3.googleusercontent.com/d/test_drive_file_id_12345",
        "https://drive.google.com/thumbnail?id=test_drive_file_id_12345",
        "image",
        JSON.stringify({ test: true }),
      ]
    );

    const inserted = insertRes.rows[0];
    assert(Boolean(inserted && inserted.id), `Record inserted with ID ${inserted?.id}`);
    assert(inserted.drive_file_id === "test_drive_file_id_12345", "Stored Google Drive file ID matches");
    assert(inserted.media_type === "image", "Stored media_type matches");

    // Clean up test row
    await queryDb(`DELETE FROM media WHERE id = $1`, [inserted.id]);
    const cleanupCheck = await queryDb(`SELECT id FROM media WHERE id = $1`, [inserted.id]);
    assert(cleanupCheck.rows.length === 0, "Cleaned up verification record successfully");
  } catch (dbErr: any) {
    console.error("Database test error:", dbErr.message);
    failed++;
  }

  // 4. Test Auth.js NextAuth initialization
  console.log("\n--- 4. Auth.js Administrator Authentication ---");
  assert(typeof auth === "function", "Auth.js auth() helper is exported and initialized");

  console.log("\n==================================================");
  console.log(`  Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
