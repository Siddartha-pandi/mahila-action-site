import crypto from "node:crypto";
import { queryDb, getNextSafeSequenceId } from "./db";
import { formatMediaFilename } from "./mediaShared";
import { uploadToStorage, buildObjectKey, getPublicUrl } from "./storage";

/**
 * Ensures an image URL is saved to the PostgreSQL media table if it is a base64 Data URL.
 * If already a permanent URL (like /api/media/123 or https://...), it returns the URL unchanged.
 * If it is a base64 data URL (e.g. data:image/png;base64,...), it inserts the binary data into the
 * PostgreSQL media table and returns the clean permanent URL `/api/media/<id>`.
 */
export async function ensureMediaUrl(
  imageUrl: string | undefined | null,
  defaultFilename = "image.png"
): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") {
    return imageUrl || "";
  }

  // Already a permanent URL
  if (!imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  // Parse data URL format: data:<mimeType>;base64,<data>
  const match = imageUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/);
  if (!match) {
    return imageUrl;
  }

  let mimeType = match[1].toLowerCase().trim();
  if (mimeType === "image/jpg") mimeType = "image/jpeg";
  const cleanBase64 = match[2].trim().replace(/\s/g, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  if (!buffer || buffer.length === 0) {
    return imageUrl;
  }

  const ext = mimeType.split("/")[1]?.replace("+xml", "") || "png";
  const byteSize = buffer.length;
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  // 1. DUPLICATE CHECK: Reuse existing image if exact duplicate already in media table
  try {
    const existing = await queryDb(
      `SELECT id FROM media
       WHERE metadata->>'checksum' = $1
          OR (byte_size = $2 AND data = $3)
       ORDER BY id DESC LIMIT 1`,
      [checksum, byteSize, buffer]
    );
    if (existing.rows.length > 0 && existing.rows[0]?.id) {
      return `/api/media/${existing.rows[0].id}`;
    }
  } catch (checkErr) {
    console.warn("ensureMediaUrl duplicate check error:", checkErr);
  }

  // 2. Reserve next sequence ID safely (preventing sequence drift / collisions)
  let nextId = await getNextSafeSequenceId("media", "id");

  const rawTitle = defaultFilename.replace(/\.[^/.]+$/, "");
  let formattedFilename = formatMediaFilename(rawTitle, nextId, ext);

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
        originalName: defaultFilename,
        checksum,
      });
      s3Bucket = uploadResult.bucket;
      s3ObjectKey = uploadResult.objectKey;
      s3PublicUrl = uploadResult.publicUrl || getPublicUrl(uploadResult.objectKey, uploadResult.bucket);
      isS3 = true;
    } catch (s3Err: any) {
      console.warn("Neon S3 upload failed in ensureMediaUrl, falling back to database binary:", s3Err?.message || s3Err);
    }
  }

  let localProxyUrl = `/api/media/${nextId}`;
  let finalUrl = s3PublicUrl || localProxyUrl;
  let fallbackUrlHash = crypto.createHash("sha256").update(localProxyUrl).digest("hex");
  let metadata = {
    checksum,
    urlHash: fallbackUrlHash,
    title: rawTitle,
    source: isS3 ? "neon_object_storage" : "database_storage",
    bucket: s3Bucket,
    objectKey: s3ObjectKey,
  };

  try {
    let res: any;
    try {
      res = await queryDb(
        `INSERT INTO media (id, uuid, filename, mime_type, byte_size, data, object_key, bucket_name, visibility, url, url_hash, thumbnail_url, media_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'image', $13)
         RETURNING id, url`,
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
          JSON.stringify(metadata),
        ]
      );
    } catch (insertErr: any) {
      if (insertErr?.code === "23505" || insertErr?.message?.includes("media_pkey")) {
        console.warn("ensureMediaUrl: Retrying insert with refreshed sequence ID after unique constraint collision...");
        nextId = await getNextSafeSequenceId("media", "id");
        formattedFilename = formatMediaFilename(rawTitle, nextId, ext);
        localProxyUrl = `/api/media/${nextId}`;
        finalUrl = s3PublicUrl || localProxyUrl;
        fallbackUrlHash = crypto.createHash("sha256").update(localProxyUrl).digest("hex");
        metadata.urlHash = fallbackUrlHash;
        res = await queryDb(
          `INSERT INTO media (id, uuid, filename, mime_type, byte_size, data, object_key, bucket_name, visibility, url, url_hash, thumbnail_url, media_type, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'image', $13)
           RETURNING id, url`,
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
            JSON.stringify(metadata),
          ]
        );
      } else {
        throw insertErr;
      }
    }

    const row = res.rows?.[0];
    if (row?.url) {
      return row.url;
    }
    if (row?.id) {
      return `/api/media/${row.id}`;
    }
  } catch (err) {
    console.error("ensureMediaUrl: Failed to store image data URL in media table:", err);
  }

  return imageUrl;
}

/**
 * Ensures all image URLs in an array (e.g. photo galleries) are saved in the media table.
 */
export async function ensureMediaUrlsArray(
  urls: (string | any)[] | undefined | null,
  prefix = "gallery"
): Promise<string[]> {
  if (!Array.isArray(urls)) return [];
  const results: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    if (typeof u === "string") {
      results.push(await ensureMediaUrl(u, `${prefix}-${i + 1}.png`));
    } else {
      results.push(u);
    }
  }
  return results;
}

/**
 * Scans rich text HTML (e.g. blog post content) for inline base64 images (<img src="data:image/...>),
 * saves them to the PostgreSQL media table, and replaces them with clean `/api/media/<id>` URLs.
 */
export async function ensureHtmlMediaUrls(
  html: string | undefined | null,
  prefix = "content-embedded"
): Promise<string> {
  if (!html || typeof html !== "string" || !html.includes("data:image/")) {
    return html || "";
  }

  // Regex to extract data:image/... URLs
  const regex = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g;
  const matches = Array.from(new Set(html.match(regex) || []));

  let result = html;
  let idx = 1;
  for (const dataUrl of matches) {
    const mediaUrl = await ensureMediaUrl(dataUrl, `${prefix}-${Date.now()}-${idx++}.png`);
    result = result.split(dataUrl).join(mediaUrl);
  }

  return result;
}
