import { initDb, getPool } from "../lib/db";

async function main() {
  console.log("Starting database seeding script...");
  try {
    await initDb();
    const pool = await getPool();
    
    // Summary report of seeded tables
    const userCount = await pool.query("SELECT COUNT(*) as count FROM users;");
    const categoryCount = await pool.query("SELECT COUNT(*) as count FROM cms_categories;");
    const eventCount = await pool.query("SELECT COUNT(*) as count FROM cms_events;");
    const postCount = await pool.query("SELECT COUNT(*) as count FROM cms_blog_posts;");
    const councilorCount = await pool.query("SELECT COUNT(*) as count FROM cms_councilors;");
    const timelineCount = await pool.query("SELECT COUNT(*) as count FROM cms_timeline;");
    const contactCount = await pool.query("SELECT COUNT(*) as count FROM cms_contact;");

    const getCount = (res: any) => res.rows[0]?.count ?? res.rows[0]?.["COUNT(*)"] ?? 0;

    console.log("\n==================================================");
    console.log("Database Initialization & Seeding Complete!");
    console.log("==================================================");
    console.log(`Users:          ${getCount(userCount)}`);
    console.log(`Categories:     ${getCount(categoryCount)}`);
    console.log(`Events:         ${getCount(eventCount)}`);
    console.log(`Blog Posts:     ${getCount(postCount)}`);
    console.log(`Councilors:     ${getCount(councilorCount)}`);
    console.log(`Timeline:       ${getCount(timelineCount)}`);
    console.log(`Contact Record: ${getCount(contactCount)}`);
    console.log("==================================================\n");

    if (typeof pool.end === "function") {
      await pool.end();
    }
    process.exit(0);
  } catch (err) {
    console.error("Error during database seeding:", err);
    process.exit(1);
  }
}

main();
