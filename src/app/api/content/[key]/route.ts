import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { ensureMediaUrl } from "@/lib/mediaServer";
import { getDbSetting, setDbSetting } from "@/lib/siteSettings";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_CONTENT_PATH = path.join(process.cwd(), "src", "data", "site_content.json");

export function generateStaticParams() {
  return [];
}

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await verifyAdminPermission(req, "stories", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { key } = await params;
    const body = await req.json();
    const { value } = body || {};
    if (typeof value !== "string") {
      return NextResponse.json({ error: "value must be a string" }, { status: 400 });
    }

    const current = await readSiteContent();
    current[key] = await ensureMediaUrl(value, `content-${key}.png`);

    // 1. Persist to PostgreSQL database for serverless production
    await setDbSetting("site_content", current);

    // 2. Optional local write
    try {
      await fs.mkdir(path.dirname(SITE_CONTENT_PATH), { recursive: true });
      await fs.writeFile(SITE_CONTENT_PATH, JSON.stringify(current, null, 2), "utf-8");
    } catch {}

    return NextResponse.json({ ok: true, key, value: current[key] });
  } catch (err: any) {
    console.error("PUT /api/content/[key] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
