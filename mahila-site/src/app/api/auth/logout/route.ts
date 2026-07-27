import { NextResponse } from "next/server";
import { createClearAdminCookieHeader } from "@/lib/auth";

export async function POST() {
  const cookieHeader = createClearAdminCookieHeader();
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": cookieHeader } });
}
