import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const TIMELINE_PATH = path.join(process.cwd(), "src", "data", "timeline.json");

export function generateStaticParams() {
  return [];
}

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const list = await readTimeline();
    const item = list.find((t) => String(t.id) === String(id));
    if (!item) {
      return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...item,
      id: String(item.id),
      order: Number(item.order_index ?? item.order ?? 0),
      order_index: Number(item.order_index ?? item.order ?? 0),
    });
  } catch (err: any) {
    console.error("GET /api/cms/timeline/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { ensureMediaUrl } from "@/lib/mediaServer";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const b = await req.json();
    const list = await readTimeline();
    const idx = list.findIndex((t) => String(t.id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });
    }

    const orderIndex =
      b.order !== undefined || b.order_index !== undefined
        ? Number(b.order ?? b.order_index)
        : list[idx].order_index ?? list[idx].order ?? 0;

    const storedImage = b.image !== undefined
      ? await ensureMediaUrl(b.image, `timeline-${id}.png`)
      : list[idx].image;

    const updated: TimelineRecord = {
      ...list[idx],
      year: b.year ?? list[idx].year,
      title: b.title ?? list[idx].title,
      description: b.description !== undefined ? b.description : list[idx].description,
      image: storedImage,
      order: orderIndex,
      order_index: orderIndex,
    };

    list[idx] = updated;
    await writeTimeline(list);

    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    console.error("PATCH /api/cms/timeline/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const list = await readTimeline();
    const next = list.filter((t) => String(t.id) !== String(id));
    if (next.length === list.length) {
      return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });
    }

    await writeTimeline(next);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/cms/timeline/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
