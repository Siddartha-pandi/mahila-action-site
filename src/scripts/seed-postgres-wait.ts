import { initDb, getPool } from "../lib/db";

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitForDb(retries = 30, intervalMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const pool = await getPool();
      if (!pool) throw new Error("pool unavailable");
      // quick probe
      await pool.query("SELECT 1");
      return true;
    } catch (err) {
      const attempt = i + 1;
      console.log(`DB probe attempt ${attempt}/${retries} failed: ${err?.message || err}`);
      if (attempt < retries) await delay(intervalMs);
    }
  }
  return false;
}

async function main() {
  console.log("Starting resilient DB seeding wrapper...");

  const dbReady = await waitForDb(36, 5000); // ~3 minutes max
  if (!dbReady) {
    console.error("Database did not become ready within timeout. Aborting seed.");
    process.exit(1);
  }

  try {
    // initDb will ensure schema is applied and default data seeded
    await initDb();

    // Print a short summary similar to the existing seeder
    const pool = await getPool();
    const counts = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM users;"),
      pool.query("SELECT COUNT(*) as count FROM cms_categories;"),
      pool.query("SELECT COUNT(*) as count FROM cms_events;"),
      pool.query("SELECT COUNT(*) as count FROM cms_blog_posts;"),
      pool.query("SELECT COUNT(*) as count FROM cms_councilors;"),
      pool.query("SELECT COUNT(*) as count FROM cms_timeline;"),
      pool.query("SELECT COUNT(*) as count FROM cms_contact;"),
    ]).catch(() => []);

    const getCount = (res: any) => res?.rows?.[0]?.count ?? res?.rows?.[0]?.["COUNT(*)"] ?? 0;

    if (counts.length) {
      console.log("\n==================================================");
      console.log("Database Seeding Summary");
      console.log("==================================================");
      console.log(`Users:          ${getCount(counts[0])}`);
      console.log(`Categories:     ${getCount(counts[1])}`);
      console.log(`Events:         ${getCount(counts[2])}`);
      console.log(`Blog Posts:     ${getCount(counts[3])}`);
      console.log(`Councilors:     ${getCount(counts[4])}`);
      console.log(`Timeline:       ${getCount(counts[5])}`);
      console.log(`Contact Record: ${getCount(counts[6])}`);
      console.log("==================================================\n");
    }

    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

main();
