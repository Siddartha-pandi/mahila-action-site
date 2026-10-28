import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const COUNCILORS_PATH = path.join(process.cwd(), "src", "data", "councilors.json");

export function generateStaticParams() {
  return [];
}

interface CouncilorRecord {
  id: string | number;
  name: string;
  role?: string;
  bio?: string;
  image?: string;
  order?: number;
  order_index?: number;
}

async function readCouncilors(): Promise<CouncilorRecord[]> {
  try {
    const raw = await fs.readFile(COUNCILORS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeCouncilors(data: CouncilorRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(COUNCILORS_PATH), { recursive: true });
  await fs.writeFile(COUNCILORS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const list = await readCouncilors();
    const item = list.find((c) => String(c.id) === String(id));
    if (!item) {
      return NextResponse.json({ error: "Councilor not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...item,
      id: String(item.id),
      order: Number(item.order_index ?? item.order ?? 0),
      order_index: Number(item.order_index ?? item.order ?? 0),
    });
  } catch (err: any) {
    console.error("GET /api/cms/councilors/[id] error:", err);
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
    const list = await readCouncilors();
    const idx = list.findIndex((c) => String(c.id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ error: "Councilor not found" }, { status: 404 });
    }

    const orderIndex =
      b.order !== undefined || b.order_index !== undefined
        ? Number(b.order ?? b.order_index)
        : list[idx].order_index ?? list[idx].order ?? 0;

    const storedImage = b.image !== undefined
      ? await ensureMediaUrl(b.image, `councilor-${id}.png`)
      : list[idx].image;

    const updated: CouncilorRecord = {
      ...list[idx],
      name: b.name ?? list[idx].name,
      role: b.role !== undefined ? b.role : list[idx].role,
      bio: b.bio !== undefined ? b.bio : list[idx].bio,
      image: storedImage,
      order: orderIndex,
      order_index: orderIndex,
    };

    list[idx] = updated;
    await writeCouncilors(list);

    return NextResponse.json({ ok: true, councilor: updated });
  } catch (err: any) {
    console.error("PATCH /api/cms/councilors/[id] error:", err);
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
    const list = await readCouncilors();
    const next = list.filter((c) => String(c.id) !== String(id));
    if (next.length === list.length) {
      return NextResponse.json({ error: "Councilor not found" }, { status: 404 });
    }

    await writeCouncilors(next);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/cms/councilors/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
