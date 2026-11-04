import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { checkDriveConnection, isGoogleDriveConfigured } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const isConfigured = isGoogleDriveConfigured();
    if (!isConfigured) {
      return NextResponse.json({
        ok: true,
        configured: false,
        connected: false,
        message: "Google Drive OAuth credentials are not yet configured in environment variables.",
      });
    }

    const check = await checkDriveConnection();
    return NextResponse.json({
      ok: true,
      configured: true,
      connected: check.connected,
      email: check.email,
      folderId: check.folderId,
      folderName: check.folderName,
      error: check.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to check Google Drive status" },
      { status: 500 }
    );
  }
}

