import { Router } from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

export const cmsRouter = Router();

// ── Events ──────────────────────────────────────────────────────────────
cmsRouter.get("/events", (_req, res) => {
  const rows = db.prepare("SELECT * FROM cms_events ORDER BY event_date ASC").all();
  res.json(rows.map((r) => ({ ...r, windows: JSON.parse(r.windows || "[]") })));
});

cmsRouter.post("/events", requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = b.id || nanoid();
  db.prepare(
    `INSERT INTO cms_events (id, title, description, image, event_date, location, total_seats, windows)
     VALUES (@id, @title, @description, @image, @event_date, @location, @total_seats, @windows)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, image=excluded.image,
       event_date=excluded.event_date, location=excluded.location, total_seats=excluded.total_seats, windows=excluded.windows`
  ).run({
    id,
    title: b.title,
    description: b.description || null,
    image: b.image || null,
    event_date: b.event_date,
    location: b.location || null,
    total_seats: Number(b.total_seats) || 0,
    windows: JSON.stringify(b.windows || []),
  });
  res.json({ ok: true, id });
});

cmsRouter.delete("/events/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM cms_events WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Categories ──────────────────────────────────────────────────────────
cmsRouter.get("/categories", (_req, res) => {
  res.json(db.prepare("SELECT * FROM cms_categories ORDER BY name ASC").all());
});

cmsRouter.post("/categories", requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = b.id || nanoid();
  db.prepare(
    `INSERT INTO cms_categories (id, name) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`
  ).run(id, b.name);
  res.json({ ok: true, id });
});

cmsRouter.delete("/categories/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM cms_categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Blog posts (stories / event blogs / impact detail pages) ────────────
cmsRouter.get("/blog-posts", (req, res) => {
  const { section } = req.query;
  const rows = section
    ? db.prepare("SELECT * FROM cms_blog_posts WHERE section = ? ORDER BY created_at DESC").all(section)
    : db.prepare("SELECT * FROM cms_blog_posts ORDER BY created_at DESC").all();
  res.json(rows.map((r) => ({ ...r, gallery: JSON.parse(r.gallery || "[]"), tags: JSON.parse(r.tags || "[]") })));
});

cmsRouter.get("/blog-posts/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM cms_blog_posts WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, gallery: JSON.parse(row.gallery || "[]"), tags: JSON.parse(row.tags || "[]") });
});

cmsRouter.post("/blog-posts", requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = b.id || nanoid();
  db.prepare(
    `INSERT INTO cms_blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
     VALUES (@id, @section, @category_id, @title, @excerpt, @content, @cover_image, @gallery, @tags)
     ON CONFLICT(id) DO UPDATE SET section=excluded.section, category_id=excluded.category_id, title=excluded.title,
       excerpt=excluded.excerpt, content=excluded.content, cover_image=excluded.cover_image,
       gallery=excluded.gallery, tags=excluded.tags`
  ).run({
    id,
    section: b.section,
    category_id: b.category_id || null,
    title: b.title,
    excerpt: b.excerpt || null,
    content: b.content || null,
    cover_image: b.cover_image || null,
    gallery: JSON.stringify(b.gallery || []),
    tags: JSON.stringify(b.tags || []),
  });
  res.json({ ok: true, id });
});

cmsRouter.delete("/blog-posts/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM cms_blog_posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Councilors ──────────────────────────────────────────────────────────
cmsRouter.get("/councilors", (_req, res) => {
  res.json(db.prepare("SELECT * FROM cms_councilors ORDER BY order_index ASC").all());
});

cmsRouter.post("/councilors", requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = b.id || nanoid();
  db.prepare(
    `INSERT INTO cms_councilors (id, name, role, bio, image, order_index)
     VALUES (@id, @name, @role, @bio, @image, @order_index)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, bio=excluded.bio,
       image=excluded.image, order_index=excluded.order_index`
  ).run({ id, name: b.name, role: b.role || null, bio: b.bio || null, image: b.image || null, order_index: Number(b.order_index) || 0 });
  res.json({ ok: true, id });
});

cmsRouter.delete("/councilors/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM cms_councilors WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Timeline ────────────────────────────────────────────────────────────
cmsRouter.get("/timeline", (_req, res) => {
  res.json(db.prepare("SELECT * FROM cms_timeline ORDER BY order_index ASC").all());
});

cmsRouter.post("/timeline", requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = b.id || nanoid();
  db.prepare(
    `INSERT INTO cms_timeline (id, year, title, description, image, order_index)
     VALUES (@id, @year, @title, @description, @image, @order_index)
     ON CONFLICT(id) DO UPDATE SET year=excluded.year, title=excluded.title, description=excluded.description,
       image=excluded.image, order_index=excluded.order_index`
  ).run({ id, year: b.year, title: b.title, description: b.description || null, image: b.image || null, order_index: Number(b.order_index) || 0 });
  res.json({ ok: true, id });
});

cmsRouter.delete("/timeline/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM cms_timeline WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Contact info (singleton row id=1) ───────────────────────────────────
cmsRouter.get("/contact-info", (_req, res) => {
  const row = db.prepare("SELECT * FROM cms_contact WHERE id = 1").get();
  res.json(row || {});
});

cmsRouter.put("/contact-info", requireAdmin, (req, res) => {
  const b = req.body || {};
  db.prepare(
    `INSERT INTO cms_contact (id, email, email_note, phone, phone_note, address, address_note, hours, hours_note)
     VALUES (1, @email, @email_note, @phone, @phone_note, @address, @address_note, @hours, @hours_note)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, email_note=excluded.email_note, phone=excluded.phone,
       phone_note=excluded.phone_note, address=excluded.address, address_note=excluded.address_note,
       hours=excluded.hours, hours_note=excluded.hours_note`
  ).run({
    email: b.email || null, email_note: b.email_note || null,
    phone: b.phone || null, phone_note: b.phone_note || null,
    address: b.address || null, address_note: b.address_note || null,
    hours: b.hours || null, hours_note: b.hours_note || null,
  });
  res.json({ ok: true });
});
