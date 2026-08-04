import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export function generateStaticParams() {
  return [];
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { key } = await params;
    const body = await req.json();
    const { value } = body || {};
    if (typeof value !== "string") {
      return NextResponse.json({ error: "value must be a string" }, { status: 400 });
    }

    await queryDb(
      `INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP::text)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, value]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/content/[key] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
