import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    const result = section
      ? await queryDb("SELECT * FROM cms_blog_posts WHERE section = $1 ORDER BY created_at DESC", [section])
      : await queryDb("SELECT * FROM cms_blog_posts ORDER BY created_at DESC");

    return NextResponse.json(
      result.rows.map((r: any) => ({
        ...r,
        coverImage: r.cover_image || r.coverImage || "",
        categoryId: r.category_id || r.categoryId || null,
        createdAt: r.created_at || r.createdAt || "",
        gallery: typeof r.gallery === "string" ? JSON.parse(r.gallery || "[]") : r.gallery || [],
        tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
      })),
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/cms/blog-posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const coverImage = b.coverImage || b.cover_image || null;
    const categoryId = b.categoryId || b.category_id ? Number(b.categoryId || b.category_id) : null;
    let finalId = b.id;

    if (b.id && !isNaN(Number(b.id))) {
      await queryDb(
        `INSERT INTO cms_blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT(id) DO UPDATE SET section=EXCLUDED.section, category_id=EXCLUDED.category_id, title=EXCLUDED.title,
           excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image,
           gallery=EXCLUDED.gallery, tags=EXCLUDED.tags`,
        [
          Number(b.id),
          b.section || "story",
          categoryId,
          b.title,
          b.excerpt || null,
          b.content || null,
          coverImage,
          JSON.stringify(b.gallery || []),
          JSON.stringify(b.tags || []),
        ]
      );
    } else {
      const res = await queryDb(
        `INSERT INTO cms_blog_posts (section, category_id, title, excerpt, content, cover_image, gallery, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          b.section || "story",
          categoryId,
          b.title,
          b.excerpt || null,
          b.content || null,
          coverImage,
          JSON.stringify(b.gallery || []),
          JSON.stringify(b.tags || []),
        ]
      );
      finalId = res.rows[0]?.id;
    }
    return NextResponse.json({ ok: true, id: finalId });
  } catch (err: any) {
    console.error("POST /api/cms/blog-posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
