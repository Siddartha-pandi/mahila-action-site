import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { ensureMediaUrl, ensureMediaUrlsArray, ensureHtmlMediaUrls } from "@/lib/mediaServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    const result = section
      ? await queryDb("SELECT * FROM blog_posts WHERE section = $1 ORDER BY created_at DESC", [section])
      : await queryDb("SELECT * FROM blog_posts ORDER BY created_at DESC");

    return NextResponse.json(
      result.rows.map((r: any) => ({
        ...r,
        coverImage: r.cover_image || r.coverImage || "",
        categoryId: r.category_id || r.categoryId || null,
        createdAt: r.created_at || r.createdAt || "",
        published: r.published !== false && r.published !== 0 && r.published !== "false",
        gallery: typeof r.gallery === "string" ? JSON.parse(r.gallery || "[]") : r.gallery || [],
        tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
      })),
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/cms/blog-posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const rawCover = b.coverImage || b.cover_image || null;
    const coverImage = await ensureMediaUrl(rawCover, "story-cover.png");
    const galleryItems = await ensureMediaUrlsArray(b.gallery || [], "story-gallery");
    const content = await ensureHtmlMediaUrls(b.content || null, "story-content");
    const categoryId = b.categoryId || b.category_id ? Number(b.categoryId || b.category_id) : null;
    const published = b.published !== undefined ? (b.published !== false && b.published !== 0 && b.published !== "false") : true;
    let finalId = b.id;

    if (b.id && !isNaN(Number(b.id))) {
      await queryDb(
        `INSERT INTO blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT(id) DO UPDATE SET section=EXCLUDED.section, category_id=EXCLUDED.category_id, title=EXCLUDED.title,
           excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image,
           gallery=EXCLUDED.gallery, tags=EXCLUDED.tags, published=EXCLUDED.published`,
        [
          Number(b.id),
          b.section || "story",
          categoryId,
          b.title,
          b.excerpt || null,
          content,
          coverImage,
          JSON.stringify(galleryItems),
          JSON.stringify(b.tags || []),
          published,
        ]
      );
    } else {
      const res = await queryDb(
        `INSERT INTO blog_posts (section, category_id, title, excerpt, content, cover_image, gallery, tags, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          b.section || "story",
          categoryId,
          b.title,
          b.excerpt || null,
          content,
          coverImage,
          JSON.stringify(galleryItems),
          JSON.stringify(b.tags || []),
          published,
        ]
      );
      finalId = res.rows[0]?.id;
    }
    return NextResponse.json({ ok: true, id: finalId, coverImage, gallery: galleryItems, published });
  } catch (err: any) {
    console.error("POST /api/cms/blog-posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
