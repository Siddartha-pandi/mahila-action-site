import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { verifySmtpConnection, sendTestEmail, getAdminNotificationEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const status = await verifySmtpConnection();
    return NextResponse.json({
      ...status,
      adminNotificationEmail: getAdminNotificationEmail(),
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: err.message,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetEmail = body.to || admin.email || getAdminNotificationEmail();

    if (!targetEmail) {
      return NextResponse.json({ error: "Target email address required." }, { status: 400 });
    }

    const result = await sendTestEmail(targetEmail);
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error || "Failed to send test email.",
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: `Test email sent successfully to ${targetEmail}`,
      messageId: result.messageId,
      simulated: result.simulated,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

