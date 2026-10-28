import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const COUNCILORS_PATH = path.join(process.cwd(), "src", "data", "councilors.json");

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

export async function GET() {
  try {
    const list = await readCouncilors();
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
    console.error("GET /api/cms/councilors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { ensureMediaUrl } from "@/lib/mediaServer";

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const orderIndex = Number(b.order ?? b.order_index ?? 0);
    const list = await readCouncilors();

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
      ? await ensureMediaUrl(b.image, `councilor-${finalId}.png`)
      : undefined;

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        name: b.name ?? list[existingIndex].name,
        role: b.role ?? list[existingIndex].role,
        bio: b.bio ?? list[existingIndex].bio,
        image: storedImage ?? list[existingIndex].image,
        order: orderIndex,
        order_index: orderIndex,
      };
    } else {
      list.push({
        id: finalId,
        name: b.name ?? "",
        role: b.role ?? "",
        bio: b.bio ?? "",
        image: storedImage ?? "",
        order: orderIndex,
        order_index: orderIndex,
      });
    }

    await writeCouncilors(list);
    return NextResponse.json({ ok: true, id: finalId, image: storedImage });
  } catch (err: any) {
    console.error("POST /api/cms/councilors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
