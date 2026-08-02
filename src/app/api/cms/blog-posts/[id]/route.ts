import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export function generateStaticParams() {
  return [];
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await queryDb("SELECT * FROM cms_blog_posts WHERE id = $1", [params.id]);
    const r = result.rows[0];
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...r,
      coverImage: r.cover_image || r.coverImage || "",
      categoryId: r.category_id || r.categoryId || null,
      createdAt: r.created_at || r.createdAt || "",
      gallery: typeof r.gallery === "string" ? JSON.parse(r.gallery || "[]") : r.gallery || [],
      tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
    });
  } catch (err: any) {
    console.error("GET /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await queryDb("DELETE FROM cms_blog_posts WHERE id = $1", [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
