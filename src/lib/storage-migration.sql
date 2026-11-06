-- ============================================================
-- Neon Object Storage Image Gallery Migration
-- Version: 1.0.0
-- Run this ONCE against your Neon PostgreSQL database.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- 1. Add storage columns to the existing media table
--    (keeps backward compatibility with BYTEA-stored legacy media)

ALTER TABLE media ADD COLUMN IF NOT EXISTS uuid TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS object_key TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS bucket_name TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

-- 2. Add a constraint to validate visibility values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_visibility_check'
  ) THEN
    ALTER TABLE media ADD CONSTRAINT media_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
END;
$$;

-- 3. Performance indexes for the new columns
CREATE INDEX IF NOT EXISTS media_uuid_idx ON media (uuid);
CREATE INDEX IF NOT EXISTS media_object_key_idx ON media (object_key);
CREATE INDEX IF NOT EXISTS media_visibility_idx ON media (visibility);
CREATE INDEX IF NOT EXISTS media_bucket_name_idx ON media (bucket_name);

-- 4. Combined index for the gallery listing query pattern
CREATE INDEX IF NOT EXISTS media_storage_gallery_idx
  ON media (visibility, media_type, created_at DESC)
  WHERE object_key IS NOT NULL;

-- 5. Backfill: mark all existing legacy media as not having S3 objects
--    (uuid and object_key remain NULL for BYTEA-stored rows)
UPDATE media
SET visibility = 'public'
WHERE visibility IS NULL OR visibility = '';

-- 6. Create a dedicated storage_images view for convenience
CREATE OR REPLACE VIEW storage_images AS
SELECT
  id,
  uuid,
  filename,
  mime_type,
  byte_size,
  object_key,
  bucket_name,
  visibility,
  url,
  thumbnail_url,
  media_type,
  metadata,
  created_at
FROM media
WHERE object_key IS NOT NULL
ORDER BY created_at DESC;

