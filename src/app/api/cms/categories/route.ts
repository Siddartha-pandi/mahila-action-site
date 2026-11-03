import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { readCategoriesFile, writeCategoriesFile, getNextCategoryId, CategoryItem } from "@/lib/categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const list = await readCategoriesFile();
    return NextResponse.json(list, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err: any) {
    console.error("GET /api/cms/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "categories", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const b = await req.json();
    const name = String(b.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const list = await readCategoriesFile();
    const providedId = b.id != null ? String(b.id).trim() : "";

    // Check if updating an existing category
    const existingIdx = providedId ? list.findIndex((c) => String(c.id) === providedId) : -1;

    let finalId: string;
    if (existingIdx >= 0) {
      // Existing category: update its name
      finalId = list[existingIdx].id;
      list[existingIdx] = { ...list[existingIdx], name };
    } else {
      // New category: assign the next sequential number as ID
      const isPureNumber = providedId && !isNaN(Number(providedId)) && Number.isInteger(Number(providedId)) && Number(providedId) > 0;
      if (isPureNumber && !list.some((c) => String(c.id) === providedId)) {
        finalId = providedId;
      } else {
        finalId = getNextCategoryId(list);
      }
      list.push({ id: finalId, name });
    }

    await writeCategoriesFile(list);
    return NextResponse.json({ ok: true, id: finalId, category: { id: finalId, name } });
  } catch (err: any) {
    console.error("POST /api/cms/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
