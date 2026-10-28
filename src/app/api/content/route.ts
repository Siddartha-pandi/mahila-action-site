import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const SITE_CONTENT_PATH = path.join(process.cwd(), "src", "data", "site_content.json");

async function readSiteContent(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(SITE_CONTENT_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const map = await readSiteContent();
    return NextResponse.json(map, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    console.error("GET /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { ensureMediaUrl } from "@/lib/mediaServer";

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const incoming = await req.json();
    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ ok: true });
    }

    const current = await readSiteContent();
    const processedIncoming: Record<string, string> = {};

    for (const [k, v] of Object.entries(incoming)) {
      if (typeof v === "string" && v.startsWith("data:image/")) {
        processedIncoming[k] = await ensureMediaUrl(v, `content-${k}.png`);
      } else {
        processedIncoming[k] = v as string;
      }
    }

    const updated = { ...current, ...processedIncoming };

    await fs.mkdir(path.dirname(SITE_CONTENT_PATH), { recursive: true });
    await fs.writeFile(SITE_CONTENT_PATH, JSON.stringify(updated, null, 2), "utf-8");

    return NextResponse.json({ ok: true, updated: processedIncoming });
  } catch (err: any) {
    console.error("PUT /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
