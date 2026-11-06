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
 * Converts a base64 Data URL to a native binary Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(parts[1] || "");
  const u8arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    u8arr[i] = binary.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
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
 * Uploads an image (File, Blob, or base64 Data URL) to S3 Cloud Storage & Media Table.
 * Returns the permanent media URL (e.g. `/api/media/42`).
 * If upload fails, gracefully falls back to data URL so user edits are not lost.
 */
export async function uploadMediaToDb(
  dataUrlOrFile: string | File | Blob,
  filename?: string,
  title?: string
): Promise<string> {
  // If already a hosted URL (not base64), return as-is
  if (typeof dataUrlOrFile === "string" && !dataUrlOrFile.startsWith("data:")) {
    return dataUrlOrFile;
  }

  let fileBlob: Blob;
  let targetFilename = filename || "image.png";

  if (typeof dataUrlOrFile === "string") {
    try {
      fileBlob = dataUrlToBlob(dataUrlOrFile);
      if (!filename) {
        const ext = fileBlob.type.split("/")[1] || "png";
        targetFilename = `image-${Date.now()}.${ext}`;
      }
    } catch {
      fileBlob = new Blob([], { type: "image/png" });
    }
  } else if (dataUrlOrFile instanceof File) {
    fileBlob = dataUrlOrFile;
    targetFilename = dataUrlOrFile.name || targetFilename;
  } else {
    fileBlob = dataUrlOrFile;
  }

  const effectiveTitle = title || targetFilename.replace(/\.[^/.]+$/, "");

  try {
    const formData = new FormData();
    formData.append("file", fileBlob, targetFilename);
    formData.append("title", effectiveTitle);

    const res = await api.post<{ ok: boolean; url: string; duplicate?: boolean; filename?: string; error?: string }>(
      "/api/media",
      formData
    );

    if (res.ok && res.data?.url) {
      return res.data.url;
    }

    console.warn("Media upload to S3 failed, using dataUrl fallback:", res.error);
    if (typeof dataUrlOrFile === "string") {
      return dataUrlOrFile;
    }
    return await fileToDataUrl(dataUrlOrFile as File);
  } catch (err: any) {
    console.error("uploadMediaToDb error:", err);
    if (typeof dataUrlOrFile === "string") {
      return dataUrlOrFile;
    }
    return await fileToDataUrl(dataUrlOrFile as File);
  }
}
