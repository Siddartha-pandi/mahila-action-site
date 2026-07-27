import { Router } from "express";
import { nanoid } from "nanoid";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

export const cmsRouter = Router();

// ── Events ──────────────────────────────────────────────────────────────
cmsRouter.get("/events", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_events ORDER BY event_date ASC");
    res.json(result.rows.map((r) => ({ ...r, windows: JSON.parse(r.windows || "[]") })));
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/events", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    await pool.query(
      `INSERT INTO cms_events (id, title, description, image, event_date, location, total_seats, windows)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, image=EXCLUDED.image,
         event_date=EXCLUDED.event_date, location=EXCLUDED.location, total_seats=EXCLUDED.total_seats, windows=EXCLUDED.windows`,
      [
        id,
        b.title,
        b.description || null,
        b.image || null,
        b.event_date,
        b.location || null,
        Number(b.total_seats) || 0,
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
    res.json(result.rows.map((r) => ({ ...r, gallery: JSON.parse(r.gallery || "[]"), tags: JSON.parse(r.tags || "[]") })));
  } catch (err) {
    next(err);
  }
});

cmsRouter.get("/blog-posts/:id", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM cms_blog_posts WHERE id = $1", [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, gallery: JSON.parse(row.gallery || "[]"), tags: JSON.parse(row.tags || "[]") });
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/blog-posts", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    await pool.query(
      `INSERT INTO cms_blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET section=EXCLUDED.section, category_id=EXCLUDED.category_id, title=EXCLUDED.title,
         excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image,
         gallery=EXCLUDED.gallery, tags=EXCLUDED.tags`,
      [
        id,
        b.section,
        b.category_id || null,
        b.title,
        b.excerpt || null,
        b.content || null,
        b.cover_image || null,
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
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/councilors", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    await pool.query(
      `INSERT INTO cms_councilors (id, name, role, bio, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, bio=EXCLUDED.bio,
         image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [id, b.name, b.role || null, b.bio || null, b.image || null, Number(b.order_index) || 0]
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
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

cmsRouter.post("/timeline", requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.id || nanoid();
    await pool.query(
      `INSERT INTO cms_timeline (id, year, title, description, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET year=EXCLUDED.year, title=EXCLUDED.title, description=EXCLUDED.description,
         image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [id, b.year, b.title, b.description || null, b.image || null, Number(b.order_index) || 0]
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
    res.json(result.rows[0] || {});
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
        b.email_note || null,
        b.phone || null,
        b.phone_note || null,
        b.address || null,
        b.address_note || null,
        b.hours || null,
        b.hours_note || null,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
