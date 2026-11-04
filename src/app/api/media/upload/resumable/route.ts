import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import {
  isGoogleDriveConfigured,
  initiateResumableUpload,
  uploadResumableChunk,
} from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/upload/resumable
 * Initiates a large-file resumable upload session with Google Drive API v3.
 * Ideal for videos up to several gigabytes.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Drive credentials are not configured in environment variables. Resumable uploads require Google Drive.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { filename, mimeType, byteSize, description } = body;

    if (!filename || !mimeType || !byteSize) {
      return NextResponse.json(
        { error: "Missing required fields: filename, mimeType, byteSize" },
        { status: 400 }
      );
    }

    const session = await initiateResumableUpload({
      filename,
      mimeType,
      byteSize: Number(byteSize),
      description,
    });

    return NextResponse.json({
      ok: true,
      uploadId: session.uploadId,
      sessionUri: session.sessionUri,
      chunkSize: session.chunkSize, // Recommended 2 MB per chunk
    });
  } catch (err: any) {
    console.error("POST /api/media/upload/resumable error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initialize resumable upload session" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/media/upload/resumable
 * Receives an individual byte chunk from the client and forwards it to the Google Drive resumable session URI.
 * Avoids any Vercel/serverless payload limit (sending 2MB per chunk).
 */
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const sessionUri = req.headers.get("x-session-uri");
    const rangeStart = Number(req.headers.get("x-range-start"));
    const rangeEnd = Number(req.headers.get("x-range-end"));
    const totalSize = Number(req.headers.get("x-total-size"));
    const filename = decodeURIComponent(req.headers.get("x-filename") || "large-video.mp4");
    const mimeType = (req.headers.get("x-mime-type") || "video/mp4").toLowerCase();

    if (!sessionUri || isNaN(rangeStart) || isNaN(rangeEnd) || isNaN(totalSize)) {
      return NextResponse.json(
        { error: "Missing required chunk headers: x-session-uri, x-range-start, x-range-end, x-total-size" },
        { status: 400 }
      );
    }

    const arrayBuffer = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    const chunkResult = await uploadResumableChunk({
      sessionUri,
      chunkBuffer,
      rangeStart,
      rangeEnd,
      totalSize,
    });

    // Upload incomplete (HTTP 308) - waiting for remaining chunks
    if (!chunkResult.completed) {
      return NextResponse.json({
        ok: true,
        completed: false,
        bytesUploaded: rangeEnd + 1,
        rangeReceived: chunkResult.rangeReceived,
      });
    }

    // Upload completed! (HTTP 200/201) - record in PostgreSQL
    const driveFile = chunkResult.driveFile;
    if (!driveFile) {
      throw new Error("Resumable upload completed but no file details returned.");
    }

    const mediaType = mimeType.startsWith("video/")
      ? "video"
      : mimeType === "application/pdf"
      ? "pdf"
      : "image";

    const metadata = {
      driveFileId: driveFile.id,
      webViewLink: driveFile.webViewLink,
      webContentLink: driveFile.webContentLink,
      uploadedBy: auth.admin?.email || "admin",
      uploadMode: "resumable",
    };

    const dbRes = await queryDb(
      `INSERT INTO media (filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, filename, mime_type, byte_size, drive_file_id, url, thumbnail_url, media_type, metadata, created_at`,
      [
        filename,
        mimeType,
        totalSize,
        driveFile.id,
        driveFile.directUrl,
        driveFile.thumbnailUrl,
        mediaType,
        JSON.stringify(metadata),
      ]
    );

    const row = dbRes.rows[0];
    const localUrl = `/api/media/${row.id}`;

    return NextResponse.json({
      ok: true,
      completed: true,
      bytesUploaded: totalSize,
      media: {
        id: row.id,
        filename: row.filename,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        driveFileId: row.drive_file_id,
        url: row.url || localUrl,
        localUrl,
        thumbnailUrl: row.thumbnail_url,
        mediaType: row.media_type,
        metadata: row.metadata,
        createdAt: row.created_at,
      },
    });
  } catch (err: any) {
    console.error("PUT /api/media/upload/resumable error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process upload chunk" },
      { status: 500 }
    );
  }
}

