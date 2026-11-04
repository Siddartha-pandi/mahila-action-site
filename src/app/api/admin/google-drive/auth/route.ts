import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { getOAuth2Client } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/google-drive/auth
 * Generates an OAuth 2.0 authorization URL for the user's personal Gmail account.
 * Automatically redirects if opened directly by a browser.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    const accept = req.headers.get("accept") || "";
    if (accept.includes("text/html") && !accept.includes("application/json")) {
      return NextResponse.redirect(new URL("/admin?tab=media", req.url));
    }
    return NextResponse.json({ error: auth.error || "Not authenticated" }, { status: auth.status || 401 });
  }

  try {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // Force consent so Google always returns a refresh token
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });

    const accept = req.headers.get("accept") || "";
    // If request comes from direct browser navigation, redirect directly
    if (accept.includes("text/html") && !accept.includes("application/json")) {
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ ok: true, url: authUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate Google Drive OAuth URL. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 500 }
    );
  }
}
