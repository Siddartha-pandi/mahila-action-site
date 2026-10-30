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
        id: String(r.id),
        coverImage: r.cover_image || r.coverImage || "",
        categoryId: r.category_id != null ? String(r.category_id) : (r.categoryId != null ? String(r.categoryId) : null),
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

    // Resolve categoryId safely without ever passing NaN to PostgreSQL INTEGER
    let resolvedCategoryId: number | null = null;
    const rawCat = b.categoryId !== undefined ? b.categoryId : (b.category_id !== undefined ? b.category_id : null);
    if (rawCat != null && rawCat !== "") {
      if (typeof rawCat === "number" && !isNaN(rawCat)) {
        resolvedCategoryId = rawCat;
      } else if (!isNaN(Number(rawCat))) {
        resolvedCategoryId = Number(rawCat);
      } else {
        const catMap: Record<string, number> = {
          cat_women: 1,
          cat_education: 2,
          cat_livelihood: 3,
          cat_wellbeing: 4,
          "women-leadership": 1,
          education: 2,
          livelihood: 3,
          wellbeing: 4,
          "women & leadership": 1,
          "education & learning": 2,
          "livelihood & skills": 3,
          "community wellbeing": 4,
        };
        const normalized = String(rawCat).toLowerCase().trim();
        if (catMap[normalized]) {
          resolvedCategoryId = catMap[normalized];
        } else {
          try {
            const catRes = await queryDb("SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1", [String(rawCat).trim()]);
            if (catRes.rows[0]?.id) {
              resolvedCategoryId = Number(catRes.rows[0].id);
            }
          } catch {}
        }
      }
    }

    const published = b.published !== undefined ? (b.published !== false && b.published !== 0 && b.published !== "false") : true;

    // Determine existing post to update if applicable
    let existingPostId: number | null = null;
    if (b.id && !isNaN(Number(b.id))) {
      const res = await queryDb("SELECT id FROM blog_posts WHERE id = $1 LIMIT 1", [Number(b.id)]);
      if (res.rows[0]?.id) {
        existingPostId = Number(res.rows[0].id);
      }
    }
    if (!existingPostId && b.title) {
      const res = await queryDb(
        "SELECT id FROM blog_posts WHERE section = $1 AND LOWER(TRIM(title)) = LOWER(TRIM($2)) LIMIT 1",
        [b.section || "story", b.title]
      );
      if (res.rows[0]?.id) {
        existingPostId = Number(res.rows[0].id);
      }
    }

    let finalId: string | number;

    if (existingPostId != null) {
      await queryDb(
        `UPDATE blog_posts SET
           section = $1,
           category_id = $2,
           title = $3,
           excerpt = $4,
           content = $5,
           cover_image = $6,
           gallery = $7,
           tags = $8,
           published = $9
         WHERE id = $10`,
        [
          b.section || "story",
          resolvedCategoryId,
          b.title,
          b.excerpt || null,
          content,
          coverImage,
          JSON.stringify(galleryItems),
          JSON.stringify(b.tags || []),
          published,
          existingPostId,
        ]
      );
      finalId = existingPostId;
    } else {
      const res = await queryDb(
        `INSERT INTO blog_posts (section, category_id, title, excerpt, content, cover_image, gallery, tags, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          b.section || "story",
          resolvedCategoryId,
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

    return NextResponse.json({
      ok: true,
      id: String(finalId),
      categoryId: resolvedCategoryId != null ? String(resolvedCategoryId) : null,
      coverImage,
      gallery: galleryItems,
      published,
    });
  } catch (err: any) {
    console.error("POST /api/cms/blog-posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
