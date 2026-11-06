/**
 * Migration Script: Migrate existing database BYTEA media to Neon Object Storage (S3)
 *
 * Usage:
 *   npx tsx src/scripts/migrate-media-to-s3.ts
 */

import dotenv from "dotenv";
dotenv.config();

import crypto from "node:crypto";
import { queryDb, initDb } from "../lib/db";
import { uploadToStorage, buildObjectKey, getPublicUrl } from "../lib/storage";

async function migrate() {
  console.log("🚀 Starting migration of database media to Neon Object Storage (S3)...");
  await initDb();

  const res = await queryDb(
    `SELECT id, filename, mime_type, byte_size, data, object_key, metadata
     FROM media
     WHERE data IS NOT NULL AND (object_key IS NULL OR object_key = '')
     ORDER BY id ASC`
  );

  const rows = res.rows;
  console.log(`Found ${rows.length} media row(s) stored in database BYTEA.`);

  if (rows.length === 0) {
    console.log("✓ All media items are already in Neon Object Storage!");
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (const row of rows) {
    try {
      const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
      const mimeType = (row.mime_type || "image/jpeg").toLowerCase();
      const fileUuid = crypto.randomUUID();
      const filename = row.filename || `image-${row.id}.jpg`;
      const objectKey = buildObjectKey(fileUuid, filename);

      console.log(`[${row.id}] Uploading "${filename}" (${buffer.length} bytes) to S3...`);

      const uploadResult = await uploadToStorage(buffer, objectKey, mimeType, "public", {
        originalName: filename,
        migratedFromDb: "true",
      });

      const s3Url = uploadResult.publicUrl || getPublicUrl(uploadResult.objectKey, uploadResult.bucket);

      const metadata = {
        ...(typeof row.metadata === "object" ? row.metadata : {}),
        migratedAt: new Date().toISOString(),
        objectKey: uploadResult.objectKey,
        bucket: uploadResult.bucket,
        source: "neon_object_storage",
      };

      // Update row in DB, set data = NULL to free up database storage!
      await queryDb(
        `UPDATE media
         SET uuid = $1,
             object_key = $2,
             bucket_name = $3,
             visibility = 'public',
             url = $4,
             data = NULL,
             metadata = $5
         WHERE id = $6`,
        [fileUuid, uploadResult.objectKey, uploadResult.bucket, s3Url, JSON.stringify(metadata), row.id]
      );

      console.log(`✓ [${row.id}] Migrated successfully -> ${uploadResult.objectKey}`);
      successCount++;
    } catch (err: any) {
      console.error(`⨯ [${row.id}] Failed to migrate "${row.filename}":`, err.message || err);
      failCount++;
    }
  }

  console.log(`\n🎉 Migration finished!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

migrate().catch((e) => {
  console.error("Migration fatal error:", e);
  process.exit(1);
});

