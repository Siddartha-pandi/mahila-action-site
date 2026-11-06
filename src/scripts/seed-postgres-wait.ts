import fs from "node:fs";
import path from "node:path";
import { initDb, getPool, seedAllData } from "../lib/db";

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitForDb(retries = 36, intervalMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const pool = await getPool();
      if (!pool) throw new Error("pool unavailable");
      // quick probe
      await pool.query("SELECT 1");
      return true;
    } catch (err: any) {
      const attempt = i + 1;
      console.log(`DB probe attempt ${attempt}/${retries} failed: ${err?.message || err}`);
      if (attempt < retries) await delay(intervalMs);
    }
  }
  return false;
}

async function main() {
  const isForce = process.argv.includes("--force") || process.argv.includes("-f");
  console.log("==================================================");
  console.log(`Starting resilient DB seeding wrapper${isForce ? " (FORCE REFRESH)" : ""}...`);
  console.log("==================================================");

  const dbReady = await waitForDb(36, 5000); // ~3 minutes max
  if (!dbReady) {
    console.error("Database did not become ready within timeout. Aborting seed.");
    process.exit(1);
  }

  let pool: any = null;
  try {
    // 1. Initialize database schema
    await initDb();
    pool = await getPool();

    // 2. Explicitly seed/re-seed default events and blog posts
    await seedAllData(pool, { force: isForce });

    // 3. Helper to safely count table rows without throwing if a table doesn't exist
    const safeCount = async (tableName: string): Promise<number | string> => {
      try {
        const res = await pool.query(`SELECT COUNT(*) as count FROM ${tableName};`);
        return Number(res.rows[0]?.count ?? res.rows[0]?.["COUNT(*)"] ?? 0);
      } catch {
        return "N/A";
      }
    };

    // 4. Query all core PostgreSQL database tables
    const [
      users,
      events,
      blogPosts,
      donations,
      reservations,
      submissions,
      volunteerReqs,
      media,
      recycleBin,
      siteSettings,
    ] = await Promise.all([
      safeCount("users"),
      safeCount("events"),
      safeCount("blog_posts"),
      safeCount("donations"),
      safeCount("event_reservations"),
      safeCount("contact_submissions"),
      safeCount("perm_volunteer_requests"),
      safeCount("media"),
      safeCount("recycle_bin"),
      safeCount("site_settings"),
    ]);

    // 5. Helper to inspect JSON data files stored in src/data/
    const getJsonStatus = (fileName: string): string => {
      const filePath = path.join(process.cwd(), "src", "data", fileName);
      try {
        if (!fs.existsSync(filePath)) return "Missing";
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return `${parsed.length} items (src/data/${fileName})`;
        }
        if (typeof parsed === "object" && parsed !== null) {
          return `Configured (src/data/${fileName})`;
        }
        return `Stored (src/data/${fileName})`;
      } catch {
        return `Stored in JSON format (src/data/${fileName})`;
      }
    };

    // Summary report
    console.log("\n==================================================");
    console.log("Database Seeding Summary");
    console.log("==================================================");
    console.log("PostgreSQL Tables:");
    console.log(`  Users:                 ${users}`);
    console.log(`  Events:                ${events}`);
    console.log(`  Blog Posts & Stories:  ${blogPosts}`);
    console.log(`  Donations:             ${donations}`);
    console.log(`  Event Reservations:    ${reservations}`);
    console.log(`  Contact Submissions:   ${submissions}`);
    console.log(`  Volunteer Requests:    ${volunteerReqs}`);
    console.log(`  Media Assets:          ${media}`);
    console.log(`  Recycle Bin:           ${recycleBin}`);
    console.log(`  Site Settings:         ${siteSettings}`);
    console.log("\nJSON File Storage (src/data/):");
    console.log(`  Categories:            ${getJsonStatus("categories.json")}`);
    console.log(`  Campaigns:             ${getJsonStatus("campaigns.json")}`);
    console.log(`  Donation Config:       ${getJsonStatus("donation_config.json")}`);
    console.log(`  Contact Info:          ${getJsonStatus("contact.json")}`);
    console.log(`  Councilors:            ${getJsonStatus("councilors.json")}`);
    console.log(`  Timeline:              ${getJsonStatus("timeline.json")}`);
    console.log(`  Site Content:          ${getJsonStatus("site_content.json")}`);
    console.log(`  App Metadata:          ${getJsonStatus("app_meta.json")}`);
    console.log("==================================================\n");

    if (typeof pool?.end === "function") {
      await pool.end();
    }
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    if (typeof pool?.end === "function") {
      try {
        await pool.end();
      } catch { }
    }
    process.exit(1);
  }
}

main();
