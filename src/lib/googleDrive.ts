import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";

export interface DriveUploadResult {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  webContentLink?: string;
  directUrl: string;
  thumbnailUrl: string;
  folderId?: string;
}

export interface ResumableSessionResult {
  uploadId: string;
  sessionUri: string;
  chunkSize: number;
  folderId: string;
}

export interface ChunkUploadResult {
  completed: boolean;
  driveFile?: DriveUploadResult;
  rangeReceived?: string;
  statusCode?: number;
}

const DEFAULT_FOLDER_NAME = "MahilaActionMedia";
let cachedFolderId: string | null = null;
let activeRefreshToken: string | null = null;

export function getActiveRefreshToken(): string {
  if (activeRefreshToken) return activeRefreshToken;
  const envToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  if (envToken && envToken !== "your_google_oauth_refresh_token") {
    activeRefreshToken = envToken;
    return envToken;
  }
  return "";
}

export function setActiveRefreshToken(token: string) {
  activeRefreshToken = token;
  process.env.GOOGLE_REFRESH_TOKEN = token;
}

/**
 * Checks whether the required Google OAuth credentials exist in environment variables.
 * Keeps all credentials strictly server-side.
 */
export function isGoogleDriveConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = getActiveRefreshToken();
  return Boolean(clientId && clientSecret && refreshToken && refreshToken !== "your_google_oauth_refresh_token");
}

/**
 * Returns an authenticated Google OAuth2 Client configured with the personal account's refresh token.
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${process.env.FRONTEND_URL || "http://localhost:3000"}/api/admin/google-drive/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const refreshToken = getActiveRefreshToken();
  if (refreshToken) {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  return oauth2Client;
}

/**
 * Returns an authenticated Google Drive API v3 client.
 */
export function getDriveClient(): drive_v3.Drive {
  const auth = getOAuth2Client();
  return google.drive({ version: "v3", auth });
}

/**
 * Helper to generate direct public URLs for Google Drive files.
 * Uses high-performance Google UserContent CDN (`lh3.googleusercontent.com/d/ID`) for images,
 * and direct view/download endpoints for PDFs and videos.
 */
export function getDriveDirectUrl(fileId: string, mimeType?: string): string {
  if (!fileId) return "";
  const isImage = mimeType ? mimeType.startsWith("image/") : true;
  if (isImage) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Returns thumbnail preview URL for a Google Drive file.
 */
export function getDriveThumbnailUrl(fileId: string, size = 600): string {
  if (!fileId) return "";
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Finds or creates the dedicated media folder ("MahilaActionMedia") in Google Drive.
 */
export async function getOrCreateMediaFolder(): Promise<string> {
  // If explicitly configured in .env, prioritize it
  const envFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (envFolderId) {
    return envFolderId;
  }

  if (cachedFolderId) {
    return cachedFolderId;
  }

  const drive = getDriveClient();

  try {
    // Search for existing folder with name "MahilaActionMedia" that is not in trash
    const res = await drive.files.list({
      q: `name = '${DEFAULT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
      pageSize: 1,
    });

    if (res.data.files && res.data.files.length > 0) {
      cachedFolderId = res.data.files[0].id!;
      return cachedFolderId;
    }

    // Create the folder if not found
    const folderMetadata = {
      name: DEFAULT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Media storage folder for Mahila Action Site",
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id, name",
    });

    if (!folder.data.id) {
      throw new Error("Failed to create Google Drive folder: no ID returned");
    }

    // Set folder permission so its contents can be publicly accessed
    try {
      await drive.permissions.create({
        fileId: folder.data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr) {
      console.warn("Could not set public permissions on media folder:", permErr);
    }

    cachedFolderId = folder.data.id;
    return cachedFolderId;
  } catch (err: any) {
    console.error("Error in getOrCreateMediaFolder:", err);
    throw new Error(`Google Drive folder error: ${err.message || err}`);
  }
}

/**
 * Sets file permission to public ('anyone' with 'reader' role) so it is publicly accessible.
 */
export async function makeFilePublic(driveFileId: string): Promise<boolean> {
  const drive = getDriveClient();
  try {
    await drive.permissions.create({
      fileId: driveFileId,
      requestBody: {
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      },
    });
    return true;
  } catch (err: any) {
    console.warn(`Warning: Could not make file ${driveFileId} public:`, err?.message || err);
    return false;
  }
}

/**
 * Uploads a file buffer or stream directly to Google Drive.
 * Supports images, videos, and PDFs.
 * Automatically makes the uploaded file publicly accessible.
 */
export async function uploadFileToDrive({
  buffer,
  filename,
  mimeType,
  description,
}: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  description?: string;
}): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const folderId = await getOrCreateMediaFolder();

  const readableStream = new Readable();
  readableStream.push(buffer);
  readableStream.push(null);

  const fileMetadata = {
    name: filename,
    parents: [folderId],
    description: description || `Uploaded via Mahila Action Site on ${new Date().toISOString()}`,
  };

  const media = {
    mimeType,
    body: readableStream,
  };

  const uploadRes = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink",
  });

  const file = uploadRes.data;
  if (!file.id) {
    throw new Error("Google Drive upload failed: No file ID returned.");
  }

  // Make the file publicly accessible
  await makeFilePublic(file.id);

  const directUrl = getDriveDirectUrl(file.id, mimeType);
  const thumbnailUrl = file.thumbnailLink || getDriveThumbnailUrl(file.id);

  return {
    id: file.id,
    name: file.name || filename,
    mimeType: file.mimeType || mimeType,
    size: Number(file.size || buffer.length),
    webViewLink: file.webViewLink || undefined,
    webContentLink: file.webContentLink || undefined,
    directUrl,
    thumbnailUrl,
    folderId,
  };
}

/**
 * Initiates a large-file resumable upload session with Google Drive API v3.
 * Essential for large video files and bypasses serverless payload limits.
 */
export async function initiateResumableUpload({
  filename,
  mimeType,
  byteSize,
  description,
}: {
  filename: string;
  mimeType: string;
  byteSize: number;
  description?: string;
}): Promise<ResumableSessionResult> {
  const oauth2Client = getOAuth2Client();
  const token = await oauth2Client.getAccessToken();
  if (!token.token) {
    throw new Error("Failed to obtain OAuth access token for Google Drive resumable upload.");
  }

  const folderId = await getOrCreateMediaFolder();

  const metadata = {
    name: filename,
    parents: [folderId],
    description: description || `Resumable upload via Mahila Action Site`,
  };

  // Initiate resumable session with Google Drive upload endpoint
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": byteSize.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(`Google Drive resumable upload initiation failed: ${initResponse.status} ${errorText}`);
  }

  const sessionUri = initResponse.headers.get("location");
  if (!sessionUri) {
    throw new Error("Google Drive resumable session failed: Missing Location header.");
  }

  // Generate a random upload identifier
  const uploadId = Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64url");

  return {
    uploadId,
    sessionUri,
    chunkSize: 2 * 1024 * 1024, // 2 MB chunks (safe for Vercel's 4.5 MB request limit)
    folderId,
  };
}

/**
 * Uploads a single byte chunk to a Google Drive resumable session URI.
 * Handles HTTP 308 (Resume Incomplete) and HTTP 200/201 (Upload Complete).
 */
export async function uploadResumableChunk({
  sessionUri,
  chunkBuffer,
  rangeStart,
  rangeEnd,
  totalSize,
}: {
  sessionUri: string;
  chunkBuffer: Buffer;
  rangeStart: number;
  rangeEnd: number;
  totalSize: number;
}): Promise<ChunkUploadResult> {
  const contentRange = `bytes ${rangeStart}-${rangeEnd}/${totalSize}`;

  const response = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Length": chunkBuffer.length.toString(),
      "Content-Range": contentRange,
    },
    body: new Uint8Array(chunkBuffer) as any,
  });

  // HTTP 308 Resume Incomplete: Chunk accepted, waiting for more
  if (response.status === 308) {
    const rangeHeader = response.headers.get("range") || "";
    return {
      completed: false,
      rangeReceived: rangeHeader,
      statusCode: 308,
    };
  }

  // HTTP 200 / 201: Upload finished
  if (response.ok) {
    const data = (await response.json()) as any;
    if (data.id) {
      // Make file public
      await makeFilePublic(data.id);
      const directUrl = getDriveDirectUrl(data.id, data.mimeType);
      const thumbnailUrl = getDriveThumbnailUrl(data.id);

      return {
        completed: true,
        statusCode: response.status,
        driveFile: {
          id: data.id,
          name: data.name,
          mimeType: data.mimeType,
          size: Number(data.size || totalSize),
          webViewLink: data.webViewLink,
          webContentLink: data.webContentLink,
          directUrl,
          thumbnailUrl,
        },
      };
    }
  }

  const errorText = await response.text();
  throw new Error(`Google Drive chunk upload failed with status ${response.status}: ${errorText}`);
}

/**
 * Permanently deletes a file from Google Drive.
 */
export async function deleteFileFromDrive(driveFileId: string): Promise<boolean> {
  const drive = getDriveClient();
  try {
    await drive.files.delete({
      fileId: driveFileId,
    });
    return true;
  } catch (err: any) {
    // If file already not found in Drive (404), treat as deleted
    if (err.code === 404 || err?.status === 404) {
      return true;
    }
    console.error(`deleteFileFromDrive error for ${driveFileId}:`, err);
    throw err;
  }
}

/**
 * Retrieves a file metadata from Google Drive.
 */
export async function getFileMetadataFromDrive(driveFileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: driveFileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, md5Checksum",
  });
  return res.data;
}

/**
 * Streams file content from Google Drive (used for streaming video or proxying with Range headers).
 */
export async function getFileStreamFromDrive(
  driveFileId: string,
  range?: string
): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
  filename: string;
}> {
  const drive = getDriveClient();
  const meta = await getFileMetadataFromDrive(driveFileId);

  const requestOptions: any = {
    fileId: driveFileId,
    alt: "media",
  };

  const headers: Record<string, string> = {};
  if (range) {
    headers["Range"] = range;
  }

  const res = await drive.files.get(requestOptions, {
    responseType: "stream",
    headers,
  });

  return {
    stream: res.data as NodeJS.ReadableStream,
    mimeType: meta.mimeType || "application/octet-stream",
    size: Number(meta.size || 0),
    filename: meta.name || `drive-${driveFileId}`,
  };
}

/**
 * Checks connection to Google Drive and returns current account/folder details.
 */
export async function checkDriveConnection(): Promise<{
  connected: boolean;
  email?: string;
  folderId?: string;
  folderName?: string;
  error?: string;
}> {
  if (!isGoogleDriveConfigured()) {
    return {
      connected: false,
      error: "Google Drive OAuth credentials are not fully configured in environment variables.",
    };
  }

  const oauth2Client = getOAuth2Client();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || (await getOrCreateMediaFolder());

  // Determine connected user email using OAuth2 userinfo or GOOGLE_DRIVE_EMAIL env
  let userEmail: string = (process.env.GOOGLE_DRIVE_EMAIL || "").trim();
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userinfo = await oauth2.userinfo.get();
    if (userinfo.data?.email) {
      userEmail = userinfo.data.email;
    }
  } catch (err) {
    // If userinfo API fails due to network or restricted scope, userEmail remains valid
  }

  return {
    connected: true,
    email: userEmail,
    folderId,
    folderName: DEFAULT_FOLDER_NAME,
  };
}
