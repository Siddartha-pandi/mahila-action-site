import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { syncGoogleDriveMedia } from "@/lib/googleDriveSync";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/sync
 * Two-way auto-synchronization:
 * - Detects and prunes any media items deleted in Google Drive.
 * - Imports any newly added files from the Google Drive media folder into the catalog.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await syncGoogleDriveMedia({ force: true });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/media/sync error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to sync media with Google Drive" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/media/sync
 * Background auto-sync endpoint (respects throttle to prevent Google Drive API rate limits).
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const result = await syncGoogleDriveMedia({ force });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/media/sync error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to auto-sync media with Google Drive" },
      { status: 500 }
    );
  }
}
