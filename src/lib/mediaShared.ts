/**
 * Formats a clean filename using title, id, and extension.
 * Format: `<sanitized-title>-<id>.<ext>`
 */
export function formatMediaFilename(title: string, id: number | string, ext: string): string {
  const cleanTitle = (title || "media")
    .toLowerCase()
    .replace(/\.[^/.]+$/, "") // strip existing extension if present
    .replace(/[^a-z0-9_-]+/g, "-") // sanitize special chars to hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 50) || "media";

  const cleanExt = (ext || "jpg").replace(/^\./, "").toLowerCase();
  return `${cleanTitle}-${id}.${cleanExt}`;
}

