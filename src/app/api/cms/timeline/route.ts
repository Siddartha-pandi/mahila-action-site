import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { ensureMediaUrl } from "@/lib/mediaServer";
import { getDbSetting, setDbSetting } from "@/lib/siteSettings";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMELINE_PATH = path.join(process.cwd(), "src", "data", "timeline.json");

export interface TimelineRecord {
  id: string | number;
  year: string;
  title: string;
  description?: string;
  image?: string;
  order?: number;
  order_index?: number;
}

export async function readTimeline(): Promise<TimelineRecord[]> {
  try {
    const dbData = await getDbSetting<TimelineRecord[] | null>("timeline", null);
    if (Array.isArray(dbData) && dbData.length > 0) {
      return dbData;
    }
  } catch {}

  try {
    const raw = await fs.readFile(TIMELINE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      setDbSetting("timeline", parsed).catch(() => {});
      return parsed;
    }
  } catch {}
  return [];
}

export async function writeTimeline(data: TimelineRecord[]): Promise<void> {
  // 1. Persist to PostgreSQL database for serverless production
  await setDbSetting("timeline", data);

  // 2. Optional local write
  try {
    await fs.mkdir(path.dirname(TIMELINE_PATH), { recursive: true });
    await fs.writeFile(TIMELINE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

export async function GET() {
  try {
    const list = await readTimeline();
    const sorted = [...list].sort(
      (a, b) => Number(a.order_index ?? a.order ?? 0) - Number(b.order_index ?? b.order ?? 0)
    );
    return NextResponse.json(
      sorted.map((r) => ({
        ...r,
        id: String(r.id),
        order: Number(r.order_index ?? r.order ?? 0),
        order_index: Number(r.order_index ?? r.order ?? 0),
      })),
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/cms/timeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "timeline", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const b = await req.json();

    // If an array is passed, this is a batch re-order operation
    if (Array.isArray(b)) {
      const normalized = b.map((item: any, idx: number) => ({
        id: String(item.id),
        year: String(item.year || ""),
        title: String(item.title || ""),
        description: item.description || "",
        image: item.image || "",
        order: idx,
        order_index: idx,
      }));
      await writeTimeline(normalized);
      return NextResponse.json({ ok: true, timeline: normalized });
    }

    const title = String(b.title || "").trim();
    const year = String(b.year || "").trim();
    if (!title || !year) {
      return NextResponse.json({ error: "Milestone title and year are required." }, { status: 400 });
    }

    const list = await readTimeline();
    const orderIndex = Number(b.order ?? b.order_index ?? list.length);

    let finalId = b.id ? String(b.id) : null;
    if (!finalId) {
      const maxNum = list.reduce((max, c) => {
        const n = Number(c.id);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      finalId = String(maxNum + 1);
    }

    const existingIndex = list.findIndex((c) => String(c.id) === finalId);

    // Automatically store base64 data URLs in PostgreSQL media table
    const storedImage = b.image !== undefined
      ? await ensureMediaUrl(b.image, `timeline-${finalId}.png`)
      : undefined;

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        year,
        title,
        description: b.description ?? list[existingIndex].description,
        image: storedImage ?? list[existingIndex].image,
        order: orderIndex,
        order_index: orderIndex,
      };
    } else {
      list.push({
        id: finalId,
        year,
        title,
        description: b.description ?? "",
        image: storedImage ?? "",
        order: orderIndex,
        order_index: orderIndex,
      });
    }

    await writeTimeline(list);
    return NextResponse.json({ ok: true, id: finalId, image: storedImage });
  } catch (err: any) {
    console.error("POST /api/cms/timeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
