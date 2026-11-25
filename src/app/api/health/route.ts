import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await queryDb("SELECT 1", [], { noCache: true });
    return NextResponse.json({ ok: true, status: "healthy", db: "connected" });
  } catch (err: any) {
    console.error("GET /api/health error:", err?.message || err);
    return NextResponse.json(
      { ok: false, status: "degraded", db: "unreachable" },
      { status: 503 }
    );
  }
}
