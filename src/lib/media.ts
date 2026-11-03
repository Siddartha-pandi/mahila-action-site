import { api } from "./api";

/**
 * Converts a File to a base64 Data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetches a remote image URL and converts it to a data URL, so the crop modal
 * always works on same-origin data — this avoids the browser's canvas CORS
 * restriction that otherwise blocks cropping most externally-hosted images.
 * Returns null if the host doesn't allow cross-origin fetches (rare), in
 * which case the caller falls back to cropping the URL directly.
 */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Checks if a URL points to an image stored in our database media table.
 */
export function isDbMediaUrl(url: string): boolean {
  return typeof url === "string" && (url.startsWith("/api/media/") || url.includes("/api/media/"));
}

/**
 * Uploads an image (File or base64 Data URL) to the PostgreSQL database media table.
 * Returns the permanent database media URL (e.g. `/api/media/42`).
 * If upload fails, gracefully falls back to the data URL so no user edits are lost.
 */
export async function uploadMediaToDb(
  dataUrlOrFile: string | File,
  filename?: string
): Promise<string> {
  let dataUrl = "";
  let targetFilename = filename || "image";

  if (typeof dataUrlOrFile === "string") {
    dataUrl = dataUrlOrFile;
    // If already a URL (not a base64 data URL), keep it as is
    if (!dataUrl.startsWith("data:")) {
      return dataUrl;
    }
  } else {
    targetFilename = dataUrlOrFile.name || targetFilename;
    dataUrl = await fileToDataUrl(dataUrlOrFile);
  }

  try {
    const res = await api.post<{ ok: boolean; url: string; error?: string }>("/api/media", {
      dataUrl,
      filename: targetFilename,
    });

    if (res.ok && res.data?.url) {
      return res.data.url;
    }

    console.warn("Media upload failed, using dataUrl fallback:", res.error);
    return dataUrl;
  } catch (err: any) {
    console.error("uploadMediaToDb error:", err);
    return dataUrl;
  }
}
