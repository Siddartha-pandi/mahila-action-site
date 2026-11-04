import crypto from "node:crypto";
import { queryDb } from "./db";
import { isGoogleDriveConfigured, uploadFileToDrive } from "./googleDrive";
import { formatMediaFilename } from "./mediaShared";

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

  // 2. Reserve next sequence ID
  let nextId: number;
  try {
    const seqRes = await queryDb("SELECT nextval(pg_get_serial_sequence('media', 'id')) as next_id");
    nextId = Number(seqRes.rows[0]?.next_id);
  } catch {
    const maxRes = await queryDb("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM media");
    nextId = Number(maxRes.rows[0]?.next_id);
  }

  const rawTitle = defaultFilename.replace(/\.[^/.]+$/, "");
  const formattedFilename = formatMediaFilename(rawTitle, nextId, ext);

  try {
    if (isGoogleDriveConfigured()) {
      try {
        const driveResult = await uploadFileToDrive({
          buffer,
          filename: formattedFilename,
          mimeType,
        });

        const res = await queryDb(
          `INSERT INTO media (id, filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'image', $8)
           RETURNING id`,
          [
            nextId,
            formattedFilename,
            mimeType,
            byteSize,
            driveResult.id,
            driveResult.directUrl,
            driveResult.thumbnailUrl,
            JSON.stringify({
              driveFileId: driveResult.id,
              checksum,
              title: rawTitle,
              source: "ensureMediaUrl",
            }),
          ]
        );

        const row = res.rows?.[0];
        if (row?.id) {
          return `/api/media/${row.id}`;
        }
      } catch (driveErr) {
        console.warn("ensureMediaUrl: Drive upload failed, falling back to database bytea storage:", driveErr);
      }
    }

    const res = await queryDb(
      `INSERT INTO media (id, filename, mime_type, byte_size, data, media_type, metadata)
       VALUES ($1, $2, $3, $4, $5, 'image', $6)
       RETURNING id`,
      [nextId, formattedFilename, mimeType, byteSize, buffer, JSON.stringify({ checksum, title: rawTitle, source: "db_fallback" })]
    );

    const row = res.rows?.[0];
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
