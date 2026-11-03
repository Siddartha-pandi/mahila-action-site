import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { readCategoriesFile, writeCategoriesFile } from "@/lib/categories";

export function generateStaticParams() {
  return [];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const list = await readCategoriesFile();
    const item = list.find((c) => String(c.id) === String(id));
    if (!item) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err: any) {
    console.error("GET /api/cms/categories/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "categories", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const list = await readCategoriesFile();
    const idx = list.findIndex((c) => String(c.id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    list[idx] = { ...list[idx], name };
    await writeCategoriesFile(list);

    return NextResponse.json({ ok: true, category: list[idx] });
  } catch (err: any) {
    console.error("PATCH /api/cms/categories/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminPermission(req, "categories", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const list = await readCategoriesFile();
    const initialLen = list.length;
    const filtered = list.filter((c) => String(c.id) !== String(id));

    if (filtered.length === initialLen) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await writeCategoriesFile(filtered);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/cms/categories/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
