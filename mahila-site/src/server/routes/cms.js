import { Router } from "express";
import { nanoid } from "nanoid";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

export const cmsRouter = Router();

// ── Events ──────────────────────────────────────────────────────────────
cmsRouter.get("/events", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_events ORDER BY event_date ASC");
    res.json(
      result.rows.map((r) => ({
        ...r,
        eventDate: r.event_date || r.eventDate || "",
        totalSeats: Number(r.total_seats ?? r.totalSeats ?? 0),
        categoryId: r.category_id || r.categoryId || null,
        createdAt: r.created_at || r.createdAt || "",
        windows: typeof r.windows === "string" ? JSON.parse(r.windows || "[]") : r.windows || [],
      }))
    );
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/events", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    const title = b.title || "New Event";
    const eventDate = b.eventDate || b.event_date || new Date().toISOString().slice(0, 10);
    const totalSeats = Number(b.totalSeats ?? b.total_seats ?? 0);

    await pool.query(
      `INSERT INTO cms_events (id, title, description, image, event_date, location, total_seats, windows)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, image=EXCLUDED.image,
         event_date=EXCLUDED.event_date, location=EXCLUDED.location, total_seats=EXCLUDED.total_seats, windows=EXCLUDED.windows`,
      [
        id,
        title,
        b.description || null,
        b.image || null,
        eventDate,
        b.location || null,
        totalSeats,
        JSON.stringify(b.windows || []),
      ]
    );
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

cmsRouter.delete("/events/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cms_events WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Categories ──────────────────────────────────────────────────────────
cmsRouter.get("/categories", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_categories ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/categories", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    await pool.query(
      `INSERT INTO cms_categories (id, name) VALUES ($1, $2)
       ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name`,
      [id, b.name]
    );
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

cmsRouter.delete("/categories/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cms_categories WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Blog posts (stories / event blogs / impact detail pages) ────────────
cmsRouter.get("/blog-posts", async (req, res, next) => {
  try {
    const { section } = req.query;
    const result = section
      ? await pool.query("SELECT * FROM cms_blog_posts WHERE section = $1 ORDER BY created_at DESC", [section])
      : await pool.query("SELECT * FROM cms_blog_posts ORDER BY created_at DESC");

    res.json(
      result.rows.map((r) => ({
        ...r,
        coverImage: r.cover_image || r.coverImage || "",
        categoryId: r.category_id || r.categoryId || null,
        createdAt: r.created_at || r.createdAt || "",
        gallery: typeof r.gallery === "string" ? JSON.parse(r.gallery || "[]") : r.gallery || [],
        tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
      }))
    );
  } catch (err) {
    next(err);
  }
});

cmsRouter.get("/blog-posts/:id", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_blog_posts WHERE id = $1", [req.params.id]);
    const r = result.rows[0];
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({
      ...r,
      coverImage: r.cover_image || r.coverImage || "",
      categoryId: r.category_id || r.categoryId || null,
      createdAt: r.created_at || r.createdAt || "",
      gallery: typeof r.gallery === "string" ? JSON.parse(r.gallery || "[]") : r.gallery || [],
      tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
    });
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/blog-posts", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    const coverImage = b.coverImage || b.cover_image || null;
    const categoryId = b.categoryId || b.category_id || null;

    await pool.query(
      `INSERT INTO cms_blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET section=EXCLUDED.section, category_id=EXCLUDED.category_id, title=EXCLUDED.title,
         excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image,
         gallery=EXCLUDED.gallery, tags=EXCLUDED.tags`,
      [
        id,
        b.section,
        categoryId,
        b.title,
        b.excerpt || null,
        b.content || null,
        coverImage,
        JSON.stringify(b.gallery || []),
        JSON.stringify(b.tags || []),
      ]
    );
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

cmsRouter.delete("/blog-posts/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cms_blog_posts WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Councilors ──────────────────────────────────────────────────────────
cmsRouter.get("/councilors", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_councilors ORDER BY order_index ASC");
    res.json(
      result.rows.map((r) => ({
        ...r,
        order: Number(r.order_index ?? r.order ?? 0),
      }))
    );
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/councilors", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    const orderIndex = Number(b.order ?? b.order_index ?? 0);

    await pool.query(
      `INSERT INTO cms_councilors (id, name, role, bio, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, bio=EXCLUDED.bio,
         image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [id, b.name, b.role || null, b.bio || null, b.image || null, orderIndex]
    );
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

cmsRouter.delete("/councilors/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cms_councilors WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Timeline ────────────────────────────────────────────────────────────
cmsRouter.get("/timeline", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_timeline ORDER BY order_index ASC");
    res.json(
      result.rows.map((r) => ({
        ...r,
        order: Number(r.order_index ?? r.order ?? 0),
      }))
    );
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/timeline", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    const orderIndex = Number(b.order ?? b.order_index ?? 0);

    await pool.query(
      `INSERT INTO cms_timeline (id, year, title, description, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET year=EXCLUDED.year, title=EXCLUDED.title, description=EXCLUDED.description,
         image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [id, b.year, b.title, b.description || null, b.image || null, orderIndex]
    );
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

cmsRouter.delete("/timeline/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cms_timeline WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Contact info (singleton row id=1) ───────────────────────────────────
cmsRouter.get("/contact-info", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_contact WHERE id = 1");
    const r = result.rows[0] || {};
    res.json({
      ...r,
      emailNote: r.email_note || r.emailNote || "",
      phoneNote: r.phone_note || r.phoneNote || "",
      addressNote: r.address_note || r.addressNote || "",
      hoursNote: r.hours_note || r.hoursNote || "",
    });
  } catch (err) {
    next(err);
  }
});

cmsRouter.put("/contact-info", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    await pool.query(
      `INSERT INTO cms_contact (id, email, email_note, phone, phone_note, address, address_note, hours, hours_note)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email, email_note=EXCLUDED.email_note, phone=EXCLUDED.phone,
         phone_note=EXCLUDED.phone_note, address=EXCLUDED.address, address_note=EXCLUDED.address_note,
         hours=EXCLUDED.hours, hours_note=EXCLUDED.hours_note`,
      [
        b.email || null,
        b.emailNote || b.email_note || null,
        b.phone || null,
        b.phoneNote || b.phone_note || null,
        b.address || null,
        b.addressNote || b.address_note || null,
        b.hours || null,
        b.hoursNote || b.hours_note || null,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

