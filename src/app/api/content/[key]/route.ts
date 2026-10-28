import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const SITE_CONTENT_PATH = path.join(process.cwd(), "src", "data", "site_content.json");

export function generateStaticParams() {
  return [];
}

async function readSiteContent(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(SITE_CONTENT_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

import { ensureMediaUrl } from "@/lib/mediaServer";

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

    const current = await readSiteContent();
    current[key] = await ensureMediaUrl(value, `content-${key}.png`);

    await fs.mkdir(path.dirname(SITE_CONTENT_PATH), { recursive: true });
    await fs.writeFile(SITE_CONTENT_PATH, JSON.stringify(current, null, 2), "utf-8");

    return NextResponse.json({ ok: true, key, value: current[key] });
  } catch (err: any) {
    console.error("PUT /api/content/[key] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
