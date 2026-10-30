import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (admin) {
    return NextResponse.json({
      loggedIn: true,
      authenticated: true,
      email: admin.email,
      user: { email: admin.email, role: (admin as any).role || "admin" },
    });
  }
  return NextResponse.json({ loggedIn: false, authenticated: false });
}
