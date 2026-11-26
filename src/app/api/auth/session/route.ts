import { NextRequest, NextResponse } from "next/server";
import { createClearAdminCookieHeader, verifyLiveAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const result = await verifyLiveAdminSession(req);
  if (result.valid && result.admin) {
    return NextResponse.json(
      {
        loggedIn: true,
        authenticated: true,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role || "admin",
        permissions: result.admin.permissions ?? null,
        user: {
          id: result.admin.sub,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role || "admin",
          permissions: result.admin.permissions ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const res = NextResponse.json(
    { loggedIn: false, authenticated: false, revoked: result.revoked },
    { headers: { "Cache-Control": "no-store" } }
  );
  if (result.revoked) {
    res.headers.append("Set-Cookie", createClearAdminCookieHeader());
  }
  return res;
}
