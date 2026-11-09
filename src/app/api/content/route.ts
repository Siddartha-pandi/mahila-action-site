import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { ensureMediaUrl } from "@/lib/mediaServer";
import { getDbSetting, setDbSetting } from "@/lib/siteSettings";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_CONTENT_PATH = path.join(process.cwd(), "src", "data", "site_content.json");

async function readSiteContent(): Promise<Record<string, string>> {
  try {
    const dbData = await getDbSetting<Record<string, string> | null>("site_content", null);
    if (dbData && typeof dbData === "object" && Object.keys(dbData).length > 0) {
      return dbData;
    }
  } catch {}

  try {
    const raw = await fs.readFile(SITE_CONTENT_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    setDbSetting("site_content", parsed).catch(() => {});
    return parsed;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const map = await readSiteContent();
    return NextResponse.json(map, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("GET /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "stories", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

    // 1. Persist to PostgreSQL database for serverless production
    await setDbSetting("site_content", updated);

    // 2. Optional local write
    try {
      await fs.mkdir(path.dirname(SITE_CONTENT_PATH), { recursive: true });
      await fs.writeFile(SITE_CONTENT_PATH, JSON.stringify(updated, null, 2), "utf-8");
    } catch {}

    return NextResponse.json({ ok: true, updated: processedIncoming });
  } catch (err: any) {
    console.error("PUT /api/content error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}
