import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (admin) {
    return NextResponse.json({ loggedIn: true, email: admin.email });
  }
  return NextResponse.json({ loggedIn: false });
}
