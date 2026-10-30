import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { ensureMediaUrl, ensureMediaUrlsArray, ensureHtmlMediaUrls } from "@/lib/mediaServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const result = !isNaN(numId)
      ? await queryDb("SELECT * FROM blog_posts WHERE id = $1", [numId])
      : await queryDb("SELECT * FROM blog_posts WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) LIMIT 1", [id]);

    const r = result.rows[0];
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...r,
      id: String(r.id),
      coverImage: r.cover_image || r.coverImage || "",
      categoryId: r.category_id != null ? String(r.category_id) : (r.categoryId != null ? String(r.categoryId) : null),
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

    // Safely resolve categoryId
    let resolvedCategoryId: number | null | undefined = undefined;
    const rawCat = b.categoryId !== undefined ? b.categoryId : b.category_id;
    if (rawCat !== undefined) {
      if (rawCat === null || rawCat === "") {
        resolvedCategoryId = null;
      } else if (typeof rawCat === "number" && !isNaN(rawCat)) {
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

    const galleryItems = b.gallery ? await ensureMediaUrlsArray(b.gallery, "story-gallery") : undefined;
    const gallery = galleryItems ? JSON.stringify(galleryItems) : undefined;
    const tags = b.tags ? JSON.stringify(b.tags) : undefined;
    const published = b.published !== undefined ? (b.published !== false && b.published !== 0 && b.published !== "false") : undefined;

    // Find target post numeric id
    let targetPostId: number | null = null;
    if (!isNaN(Number(id))) {
      targetPostId = Number(id);
    } else {
      const found = await queryDb(
        "SELECT id FROM blog_posts WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) LIMIT 1",
        [id]
      );
      if (found.rows[0]?.id) {
        targetPostId = Number(found.rows[0].id);
      }
    }

    if (!targetPostId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const res = await queryDb(
      `UPDATE blog_posts SET
         section = COALESCE($1, section),
         category_id = CASE WHEN $2::text = '__SET_NULL__' THEN NULL WHEN $3::integer IS NOT NULL THEN $3::integer ELSE category_id END,
         title = COALESCE($4, title),
         excerpt = COALESCE($5, excerpt),
         content = COALESCE($6, content),
         cover_image = COALESCE($7, cover_image),
         gallery = COALESCE($8, gallery),
         tags = COALESCE($9, tags),
         published = COALESCE($10, published)
       WHERE id = $11 RETURNING *`,
      [
        section || null,
        resolvedCategoryId === null ? "__SET_NULL__" : "KEEP",
        resolvedCategoryId ?? null,
        title || null,
        excerpt || null,
        content || null,
        coverImage || null,
        gallery || null,
        tags || null,
        published ?? null,
        targetPostId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updated = res.rows[0];
    return NextResponse.json({
      ok: true,
      post: {
        ...updated,
        id: String(updated.id),
        coverImage: updated.cover_image || updated.coverImage || "",
        categoryId: updated.category_id != null ? String(updated.category_id) : null,
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
    const numId = Number(id);
    const res = !isNaN(numId)
      ? await queryDb("DELETE FROM blog_posts WHERE id = $1 RETURNING id", [numId])
      : await queryDb("DELETE FROM blog_posts WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) RETURNING id", [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: String(res.rows[0].id) });
  } catch (err: any) {
    console.error("DELETE /api/cms/blog-posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
