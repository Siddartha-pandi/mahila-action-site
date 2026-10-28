import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

import { ensureMediaUrl } from "@/lib/mediaServer";

const TIMELINE_PATH = path.join(process.cwd(), "src", "data", "timeline.json");

interface TimelineRecord {
  id: string | number;
  year: string;
  title: string;
  description?: string;
  image?: string;
  order?: number;
  order_index?: number;
}

async function readTimeline(): Promise<TimelineRecord[]> {
  try {
    const raw = await fs.readFile(TIMELINE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeTimeline(data: TimelineRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(TIMELINE_PATH), { recursive: true });
  await fs.writeFile(TIMELINE_PATH, JSON.stringify(data, null, 2), "utf-8");
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
      }))
    );
  } catch (err: any) {
    console.error("GET /api/cms/timeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const orderIndex = Number(b.order ?? b.order_index ?? 0);
    const list = await readTimeline();

    let finalId = b.id ? String(b.id) : null;
    if (!finalId) {
      const maxNum = list.reduce((max, t) => {
        const n = Number(t.id);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      finalId = String(maxNum + 1);
    }

    const existingIndex = list.findIndex((t) => String(t.id) === finalId);

    // Automatically store base64 data URLs in PostgreSQL media table
    const storedImage = b.image !== undefined
      ? await ensureMediaUrl(b.image, `timeline-${finalId}.png`)
      : undefined;

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        year: b.year ?? list[existingIndex].year,
        title: b.title ?? list[existingIndex].title,
        description: b.description ?? list[existingIndex].description,
        image: storedImage ?? list[existingIndex].image,
        order: orderIndex,
        order_index: orderIndex,
      };
    } else {
      list.push({
        id: finalId,
        year: b.year ?? "",
        title: b.title ?? "",
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
