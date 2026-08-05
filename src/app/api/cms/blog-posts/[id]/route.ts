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
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const section = b.section;
    const title = b.title;
    const excerpt = b.excerpt;
    const content = b.content;
    const coverImage = b.coverImage || b.cover_image;
    const rawCategoryId = b.categoryId ?? b.category_id;
const categoryId = rawCategoryId === undefined
  ? undefined
  : (rawCategoryId === null || rawCategoryId === "" || isNaN(Number(rawCategoryId)) ? null : Number(rawCategoryId));
    const gallery = b.gallery ? JSON.stringify(b.gallery) : undefined;
    const tags = b.tags ? JSON.stringify(b.tags) : undefined;

    const res = await queryDb(
      `UPDATE cms_blog_posts SET
         section = COALESCE($1, section),
         category_id = COALESCE($2, category_id),
         title = COALESCE($3, title),
         excerpt = COALESCE($4, excerpt),
         content = COALESCE($5, content),
         cover_image = COALESCE($6, cover_image),
         gallery = COALESCE($7, gallery),
         tags = COALESCE($8, tags)
       WHERE id = $9 RETURNING *`,
      [section || null, categoryId ?? null, title || null, excerpt || null, content || null, coverImage || null, gallery || null, tags || null, params.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const res = await queryDb("DELETE FROM cms_blog_posts WHERE id = $1 RETURNING id", [params.id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: params.id });
  } catch (err: any) {
    console.error("DELETE /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
/**/