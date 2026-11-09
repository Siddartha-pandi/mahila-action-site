import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { ensureMediaUrl } from "@/lib/mediaServer";
import { getDbSetting, setDbSetting } from "@/lib/siteSettings";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COUNCILORS_PATH = path.join(process.cwd(), "src", "data", "councilors.json");

export interface CouncilorRecord {
  id: string | number;
  name: string;
  role?: string;
  bio?: string;
  image?: string;
  order?: number;
  order_index?: number;
}

export async function readCouncilors(): Promise<CouncilorRecord[]> {
  try {
    const dbData = await getDbSetting<CouncilorRecord[] | null>("councilors", null);
    if (Array.isArray(dbData) && dbData.length > 0) {
      return dbData;
    }
  } catch {}

  try {
    const raw = await fs.readFile(COUNCILORS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      setDbSetting("councilors", parsed).catch(() => {});
      return parsed;
    }
  } catch {}
  return [];
}

export async function writeCouncilors(data: CouncilorRecord[]): Promise<void> {
  // 1. Persist to PostgreSQL database for serverless production
  await setDbSetting("councilors", data);

  // 2. Optional local write
  try {
    await fs.mkdir(path.dirname(COUNCILORS_PATH), { recursive: true });
    await fs.writeFile(COUNCILORS_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
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
      })),
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/cms/councilors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "councilors", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const b = await req.json();
    const name = String(b.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Councilor name is required." }, { status: 400 });
    }
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
