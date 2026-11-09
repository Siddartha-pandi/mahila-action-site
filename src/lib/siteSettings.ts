import { queryDb } from "./db";

/**
 * Retrieves a persistent setting from PostgreSQL `site_settings` table.
 * If the setting is not found or the database query fails, returns `fallback`.
 */
export async function getDbSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await queryDb(
      "SELECT value FROM site_settings WHERE key = $1 LIMIT 1",
      [key],
      { noCache: true }
    );
    if (res.rows && res.rows.length > 0 && res.rows[0].value) {
      try {
        return JSON.parse(res.rows[0].value) as T;
      } catch {
        return res.rows[0].value as unknown as T;
      }
    }
  } catch (err: any) {
    // If the database is initializing or table not yet ready, return fallback safely
  }
  return fallback;
}

/**
 * Persists a setting into PostgreSQL `site_settings` table.
 * This ensures that updates in serverless deployments (Vercel, Netlify, Render, etc.)
 * persist across all lambda instances and restarts without relying on the local read-only filesystem.
 */
export async function setDbSetting<T>(key: string, value: T): Promise<boolean> {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await queryDb(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, serialized]
    );
    return true;
  } catch (err: any) {
    console.error(`setDbSetting error for key "${key}":`, err?.message || err);
    return false;
  }
}

