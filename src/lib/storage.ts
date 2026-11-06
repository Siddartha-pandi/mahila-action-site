/**
 * Neon Object Storage (S3-compatible) client utilities.
 * All credentials are read from server-side environment variables ONLY.
 * Never import this file from client components.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── Environment validation ────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

// ── S3 Client Factory (singleton per process) ─────────────────────────────────

const globalRef = globalThis as any;

function getS3Client(): S3Client {
  if (globalRef._neonS3Client) return globalRef._neonS3Client;

  const endpoint = process.env.NEON_S3_ENDPOINT;
  const region = process.env.NEON_S3_REGION || "us-east-1";
  const accessKeyId = process.env.NEON_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEON_S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured. Please set NEON_S3_ENDPOINT, " +
        "NEON_S3_ACCESS_KEY_ID, and NEON_S3_SECRET_ACCESS_KEY environment variables."
    );
  }

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Required for path-style addressing used by Neon Object Storage
    forcePathStyle: true,
  });

  globalRef._neonS3Client = client;
  return client;
}

// ── Bucket name helpers ───────────────────────────────────────────────────────

export function getPublicBucket(): string {
  return process.env.NEON_PUBLIC_BUCKET || "ngo-public-media";
}

export function getPrivateBucket(): string {
  return process.env.NEON_PRIVATE_BUCKET || "ngo-private-media";
}

export function getBucketForVisibility(visibility: "public" | "private"): string {
  return visibility === "public" ? getPublicBucket() : getPrivateBucket();
}

// ── File signature (magic byte) validation ───────────────────────────────────

const MAGIC_BYTES: Record<string, { hex: string; offset: number }[]> = {
  "image/jpeg": [{ hex: "FFD8FF", offset: 0 }],
  "image/png": [{ hex: "89504E47", offset: 0 }],
  "image/gif": [
    { hex: "47494638", offset: 0 }, // GIF8
  ],
  "image/webp": [{ hex: "57454250", offset: 8 }], // WEBP at offset 8 within RIFF container
  "image/bmp": [{ hex: "424D", offset: 0 }],
  "image/avif": [{ hex: "66747970", offset: 4 }], // ftyp box
};

/**
 * Validates file magic bytes against declared MIME type.
 * Returns true if the file signature matches the expected pattern.
 */
export function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const normalizedMime = mimeType.toLowerCase().replace("image/jpg", "image/jpeg");
  const patterns = MAGIC_BYTES[normalizedMime];

  // If we don't have a pattern for this type, allow it (e.g. SVG)
  if (!patterns) return true;

  for (const { hex, offset } of patterns) {
    const expectedBytes = Buffer.from(hex, "hex");
    const fileSlice = buffer.slice(offset, offset + expectedBytes.length);
    if (fileSlice.equals(expectedBytes)) return true;
    // For WEBP: check RIFF header first
    if (normalizedMime === "image/webp") {
      const riff = buffer.slice(0, 4);
      if (riff.equals(Buffer.from("52494646", "hex"))) return true;
    }
  }

  return false;
}

// ── Allowed MIME types for image gallery ─────────────────────────────────────

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);

export const MAX_IMAGE_SIZE_BYTES = Number(process.env.STORAGE_MAX_IMAGE_SIZE_MB || 20) * 1024 * 1024;
export const PRESIGN_UPLOAD_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB
export const PRESIGN_URL_EXPIRES_SECONDS = 3600; // 1 hour for private access

// ── Object key builder ────────────────────────────────────────────────────────

/**
 * Generates a structured object key: `images/{uuid}-{safeFilename}`
 */
export function buildObjectKey(uuid: string, filename: string): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `images/${uuid}-${safe}`;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  objectKey: string;
  bucket: string;
  publicUrl: string | null;
  etag?: string;
}

/**
 * Uploads a buffer directly to the specified S3 bucket.
 * Returns the object key and public URL (for public buckets).
 */
export async function uploadToStorage(
  buffer: Buffer,
  objectKey: string,
  mimeType: string,
  visibility: "public" | "private",
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const s3 = getS3Client();
  const bucket = getBucketForVisibility(visibility);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.length,
    Metadata: metadata,
  });

  const result = await s3.send(command);

  const endpoint = process.env.NEON_S3_ENDPOINT!;
  const publicUrl =
    visibility === "public"
      ? `${endpoint.replace(/\/$/, "")}/${bucket}/${objectKey}`
      : null;

  return {
    objectKey,
    bucket,
    publicUrl,
    etag: result.ETag,
  };
}

// ── Presigned Upload URL (for large files, direct browser→S3) ────────────────

export interface PresignedUploadUrl {
  uploadUrl: string;
  objectKey: string;
  bucket: string;
  expiresAt: string;
}

/**
 * Generates a presigned PUT URL so clients can upload directly to S3.
 * The server validates the request; the client PUT goes directly to storage.
 */
export async function createPresignedUploadUrl(
  objectKey: string,
  mimeType: string,
  visibility: "public" | "private",
  expiresInSeconds = 900 // 15 minutes
): Promise<PresignedUploadUrl> {
  const s3 = getS3Client();
  const bucket = getBucketForVisibility(visibility);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return { uploadUrl, objectKey, bucket, expiresAt };
}

// ── Presigned Download URL (for private images) ───────────────────────────────

/**
 * Generates a time-limited presigned GET URL for a private object.
 */
export async function createPresignedDownloadUrl(
  objectKey: string,
  bucket: string,
  expiresInSeconds = PRESIGN_URL_EXPIRES_SECONDS
): Promise<string> {
  const s3 = getS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Returns the publicly accessible URL for a public object.
 */
export function getPublicUrl(objectKey: string, bucket: string): string {
  const endpoint = (process.env.NEON_S3_ENDPOINT || "").replace(/\/$/, "");
  return `${endpoint}/${bucket}/${objectKey}`;
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Deletes an object from S3. Does not throw if the object doesn't exist.
 */
export async function deleteFromStorage(
  objectKey: string,
  bucket: string
): Promise<void> {
  const s3 = getS3Client();

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    );
  } catch (err: any) {
    // NoSuchKey is not an error — the object is already gone
    if (err?.Code === "NoSuchKey" || err?.name === "NoSuchKey") return;
    throw err;
  }
}

// ── Object existence check ────────────────────────────────────────────────────

/**
 * Returns true if the object exists in S3.
 */
export async function objectExists(objectKey: string, bucket: string): Promise<boolean> {
  const s3 = getS3Client();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    return true;
  } catch {
    return false;
  }
}

// ── Resolve image URL for API responses ──────────────────────────────────────

/**
 * Returns the correct URL for a storage image:
 * - Public images: direct CDN/endpoint URL
 * - Private images: a fresh presigned URL valid for 1 hour
 */
export async function resolveStorageUrl(
  objectKey: string,
  bucket: string,
  visibility: "public" | "private"
): Promise<string> {
  if (visibility === "public") {
    return getPublicUrl(objectKey, bucket);
  }
  return createPresignedDownloadUrl(objectKey, bucket);
}

// ── Storage health check ──────────────────────────────────────────────────────

export async function checkStorageHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const s3 = getS3Client();
    await s3.send(
      new ListObjectsV2Command({
        Bucket: getPublicBucket(),
        MaxKeys: 1,
      })
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Retrieves an object stream directly from Neon Object Storage (S3).
 */
export async function getStorageObject(objectKey: string, bucket?: string) {
  const s3 = getS3Client();
  const targetBucket = bucket || getPublicBucket();
  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: objectKey,
  });
  return s3.send(command);
}


