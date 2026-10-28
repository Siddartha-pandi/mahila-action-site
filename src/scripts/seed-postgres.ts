import { initDb, getPool } from "../lib/db";

async function main() {
  console.log("Starting database seeding script...");
  try {
    await initDb();
    const pool = await getPool();
    
    // Summary report of seeded tables
    const userCount = await pool.query("SELECT COUNT(*) as count FROM users;");
    const categoryCount = await pool.query("SELECT COUNT(*) as count FROM categories;");
    const eventCount = await pool.query("SELECT COUNT(*) as count FROM events;");
    const postCount = await pool.query("SELECT COUNT(*) as count FROM blog_posts;");

    const getCount = (res: any) => res.rows[0]?.count ?? res.rows[0]?.["COUNT(*)"] ?? 0;

    console.log("\n==================================================");
    console.log("Database Initialization & Seeding Complete!");
    console.log("==================================================");
    console.log(`Users:          ${getCount(userCount)}`);
    console.log(`Categories:     ${getCount(categoryCount)}`);
    console.log(`Events:         ${getCount(eventCount)}`);
    console.log(`Blog Posts:     ${getCount(postCount)}`);
    console.log(`Contact Info:   Stored in JSON format (src/data/contact.json)`);
    console.log(`Councilors:     Stored in JSON format (src/data/councilors.json)`);
    console.log(`Timeline:       Stored in JSON format (src/data/timeline.json)`);
    console.log(`Site Content:   Stored in JSON format (src/data/site_content.json)`);
    console.log(`App Metadata:   Stored in JSON format (src/data/app_meta.json)`);
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
