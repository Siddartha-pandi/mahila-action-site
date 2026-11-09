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
 * Fetches a remote or relative image URL and converts it to a base64 Data URL,
 * so the crop modal always works on same-origin data — this avoids browser
 * canvas CORS/taint restrictions that otherwise block cropping externally-hosted images.
 * Uses a server-side proxy fallback for cross-origin URLs.
 */
export async function urlToDataUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;

  const isExternal = trimmed.startsWith("http://") || trimmed.startsWith("https://");

  // 1. Try our server-side proxy first for external URLs to eliminate browser CORS taint
  if (isExternal) {
    try {
      const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(trimmed)}&format=dataurl`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const json = await res.json();
        if (json?.dataUrl && typeof json.dataUrl === "string") {
          return json.dataUrl;
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  // 2. Direct fetch (works for same-origin URLs like /api/media/... or CORS-permissive domains)
  try {
    const res = await fetch(trimmed);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.type.startsWith("image/") || blob.type.startsWith("application/octet-stream")) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch {
    // Continue to next fallback
  }

  // 3. Last fallback: try proxy endpoint as binary blob if dataurl format failed
  if (isExternal) {
    try {
      const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // No further fallback
    }
  }

  return null;
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
