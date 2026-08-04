import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export function generateStaticParams() {
  return [];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM cms_categories WHERE id = $1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("GET /api/cms/categories/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { name } = body || {};

    if (!name?.trim()) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const res = await queryDb(
      "UPDATE cms_categories SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, category: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/cms/categories/[id] error:", err);
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
    const res = await queryDb("DELETE FROM cms_categories WHERE id = $1 RETURNING id", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/cms/categories/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
