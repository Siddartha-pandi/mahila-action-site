import { Router } from "express";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

export const contentRouter = Router();

// Public: read all site_content key/value pairs.
contentRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_content").all();
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  res.json(map);
});

// Admin: upsert a single key.
contentRouter.put("/:key", requireAdmin, (req, res) => {
  const { key } = req.params;
  const { value } = req.body || {};
  if (typeof value !== "string") return res.status(400).json({ error: "value must be a string" });

  db.prepare(
    `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value);

  res.json({ ok: true });
});

// Admin: upsert many keys at once (used by "Save all" in the admin panel).
contentRouter.put("/", requireAdmin, (req, res) => {
  const content = req.body || {};
  const stmt = db.prepare(
    `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) stmt.run(key, String(value));
  });
  tx(Object.entries(content));

  res.json({ ok: true });
});
