import { Router } from "express";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

export const contentRouter = Router();

// Public: read all site_content key/value pairs.
contentRouter.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT key, value FROM site_content");
    const map = {};
    for (const row of result.rows) map[row.key] = row.value;
    res.json(map);
  } catch (err) {
    next(err);
  }
});

// Admin: upsert a single key.
contentRouter.put("/:key", requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body || {};
    if (typeof value !== "string") return res.status(400).json({ error: "value must be a string" });

    await pool.query(
      `INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP::text)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, value]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Admin: upsert many keys at once (used by "Save all" in the admin panel).
contentRouter.put("/", requireAdmin, async (req, res, next) => {
  try {
    const content = req.body || {};
    const entries = Object.entries(content);

    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP::text)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [key, String(value)]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
