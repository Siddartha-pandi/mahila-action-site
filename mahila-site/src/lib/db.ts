import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

let pool: any;

export async function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required. SQLite fallback is disabled.");
  }

  const pkg = await import("pg");
  const { Pool } = pkg.default || pkg;
  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    databaseUrl.includes("sslmode=") ||
    databaseUrl.includes("neon.tech");

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;

  // Bypass database initialization during Next.js static build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("Next.js build phase detected. Skipping database initialization.");
    isInitialized = true;
    return;
  }

  try {
    const currentPool = await getPool();
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
    await currentPool.query(rawSchema);
    await currentPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS kind TEXT;");

    // Seed default categories
    const defaultCategories = [
      { id: "cat_women", name: "Women & Leadership" },
      { id: "cat_education", name: "Education & Learning" },
      { id: "cat_livelihood", name: "Livelihood & Skills" },
      { id: "cat_wellbeing", name: "Community Wellbeing" },
    ];

    for (const cat of defaultCategories) {
      await currentPool.query(
        `INSERT INTO cms_categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.name]
      );
    }

    // Seed the default superadmin user into the unified users table
    const bcrypt = (await import("bcryptjs")).default;
    const adminPasswordHash = bcrypt.hashSync("1980Jan23", 10);
    await currentPool.query(
      `INSERT INTO users (id, name, email, role, password_hash, status)
       VALUES ('admin_user_1', 'Lead Super Admin', 'mahilaaction.vsk@gmail.com', 'superadmin', $1, 'Active')
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'superadmin', status = 'Active'`,
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
  // Bypass live queries during Next.js static build phase to prevent build failure
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("Next.js build phase query intercepted. Returning empty result.");
    return { rows: [], rowCount: 0 };
  }

  if (!isInitialized) {
    await initDb();
  }
  const currentPool = await getPool();
  return currentPool.query(text, params);
}

export default pool;
