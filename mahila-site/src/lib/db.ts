import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

let pool: any;

if (process.env.DATABASE_URL) {
  // PostgreSQL (Neon / Supabase / standard PG / Azure)
  const pkg = await import("pg");
  const { Pool } = pkg.default || pkg;
  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_URL.includes("sslmode=") ||
    process.env.DATABASE_URL.includes("neon.tech");

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
} else {
  throw new Error("DATABASE_URL environment variable is required. SQLite fallback is disabled.");
}

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;
  try {
    const schemaPath1 = path.join(process.cwd(), "src/lib/schema.sql");
    const schemaPath2 = path.join(process.cwd(), "src/server/schema.sql");
    let rawSchema = "";

    if (fs.existsSync(schemaPath1)) {
      rawSchema = fs.readFileSync(schemaPath1, "utf8");
    } else if (fs.existsSync(schemaPath2)) {
      rawSchema = fs.readFileSync(schemaPath2, "utf8");
    } else {
      console.warn("schema.sql not found");
      return;
    }

    // Run the schema against PostgreSQL pool
    await pool.query(rawSchema);

    // Seed default categories
    const defaultCategories = [
      { id: "cat_women", name: "Women & Leadership" },
      { id: "cat_education", name: "Education & Learning" },
      { id: "cat_livelihood", name: "Livelihood & Skills" },
      { id: "cat_wellbeing", name: "Community Wellbeing" },
    ];

    for (const cat of defaultCategories) {
      await pool.query(
        `INSERT INTO cms_categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.name]
      );
    }

    // Seed the default superadmin user into the unified users table
    const bcrypt = (await import("bcryptjs")).default;
    const adminPasswordHash = bcrypt.hashSync("1980Jan23", 10);
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash, status)
       VALUES ('admin_user_1', 'Lead Super Admin', 'mahilaaction.vsk@gmail.com', 'superadmin', $1, 'Active')
       ON CONFLICT (id) DO UPDATE SET email = 'mahilaaction.vsk@gmail.com', password_hash = $1, role = 'superadmin'`,
      [adminPasswordHash]
    );

    isInitialized = true;
    console.log("PostgreSQL database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database:", err);
    throw err;
  }
}

export async function queryDb(text: string, params: any[] = []) {
  if (!isInitialized) {
    await initDb();
  }
  return pool.query(text, params);
}

export default pool;
