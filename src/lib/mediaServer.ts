import { queryDb } from "./db";

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
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return imageUrl;
  }

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer || buffer.length === 0) {
    return imageUrl;
  }

  const ext = mimeType.split("/")[1]?.replace("+xml", "") || "png";
  const filename = defaultFilename.includes(".") ? defaultFilename : `${defaultFilename}.${ext}`;
  const byteSize = buffer.length;

  try {
    const res = await queryDb(
      `INSERT INTO media (filename, mime_type, byte_size, data)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [filename, mimeType, byteSize, buffer]
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
