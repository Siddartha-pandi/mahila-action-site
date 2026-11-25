import { NextResponse } from "next/server";
import { createClearAdminCookieHeader, createClearUserCookieHeader } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", createClearAdminCookieHeader());
  res.headers.append("Set-Cookie", createClearUserCookieHeader());
  return res;
}
