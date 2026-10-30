import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { ensureMediaUrl, ensureMediaUrlsArray, ensureHtmlMediaUrls } from "@/lib/mediaServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await queryDb("SELECT * FROM blog_posts WHERE id = $1", [id]);
    const r = result.rows[0];
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...r,
      coverImage: r.cover_image || r.coverImage || "",
      categoryId: r.category_id || r.categoryId || null,
      createdAt: r.created_at || r.createdAt || "",
      published: r.published !== false && r.published !== 0 && r.published !== "false",
      gallery: typeof r.gallery === "string" ? JSON.parse(r.gallery || "[]") : r.gallery || [],
      tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
    });
  } catch (err: any) {
    console.error("GET /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const b = await req.json();
    const section = b.section;
    const title = b.title;
    const excerpt = b.excerpt;
    const content = b.content !== undefined ? await ensureHtmlMediaUrls(b.content, "story-content") : undefined;
    const rawCover = b.coverImage || b.cover_image;
    const coverImage = rawCover !== undefined ? await ensureMediaUrl(rawCover, "story-cover.png") : undefined;
    const categoryId = b.categoryId !== undefined || b.category_id !== undefined ? (b.categoryId || b.category_id ? Number(b.categoryId || b.category_id) : null) : undefined;
    const galleryItems = b.gallery ? await ensureMediaUrlsArray(b.gallery, "story-gallery") : undefined;
    const gallery = galleryItems ? JSON.stringify(galleryItems) : undefined;
    const tags = b.tags ? JSON.stringify(b.tags) : undefined;
    const published = b.published !== undefined ? (b.published !== false && b.published !== 0 && b.published !== "false") : undefined;

    const res = await queryDb(
      `UPDATE blog_posts SET
         section = COALESCE($1, section),
         category_id = COALESCE($2, category_id),
         title = COALESCE($3, title),
         excerpt = COALESCE($4, excerpt),
         content = COALESCE($5, content),
         cover_image = COALESCE($6, cover_image),
         gallery = COALESCE($7, gallery),
         tags = COALESCE($8, tags),
         published = COALESCE($9, published)
       WHERE id = $10 RETURNING *`,
      [section || null, categoryId ?? null, title || null, excerpt || null, content || null, coverImage || null, gallery || null, tags || null, published ?? null, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updated = res.rows[0];
    return NextResponse.json({
      ok: true,
      post: {
        ...updated,
        coverImage: updated.cover_image || updated.coverImage || "",
        categoryId: updated.category_id || updated.categoryId || null,
        published: updated.published !== false && updated.published !== 0 && updated.published !== "false",
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/cms/blog-posts/[id] error:", err);
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
    const res = await queryDb("DELETE FROM blog_posts WHERE id = $1 RETURNING id", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("DELETE /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
