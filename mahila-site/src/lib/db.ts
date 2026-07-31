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
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  // Bypass database initialization during Next.js static build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("Next.js build phase detected. Skipping database initialization.");
    isInitialized = true;
    return;
  }

  initPromise = (async () => {
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
      await currentPool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;");
      await currentPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS kind TEXT;");

      // Seed default categories
      await currentPool.query(`
        INSERT INTO cms_categories (id, name) VALUES 
          ('cat_women', 'Women & Leadership'),
          ('cat_education', 'Education & Learning'),
          ('cat_livelihood', 'Livelihood & Skills'),
          ('cat_wellbeing', 'Community Wellbeing')
        ON CONFLICT (id) DO NOTHING
      `);

      // Seed the default superadmin user into the unified users table using environment variables
      const superadminEmail = (process.env.SUPERADMIN_EMAIL || process.env.EMAIL_FROM || "admin@mahilaaction.org").toLowerCase().trim();
      const superadminPassword = process.env.SUPERADMIN_PASSWORD || "123456";

      const bcrypt = (await import("bcryptjs")).default;
      const adminPasswordHash = await bcrypt.hash(superadminPassword, 10);
      await currentPool.query(
        `INSERT INTO users (id, name, email, role, password_hash, status)
         VALUES ('admin_user_1', 'Lead Super Admin', $1, 'superadmin', $2, 'Active')
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'superadmin', status = 'Active'`,
        [superadminEmail, adminPasswordHash]
      );

      isInitialized = true;
      console.log("PostgreSQL database initialized successfully.");
    } catch (err) {
      console.error("Failed to initialize database:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
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
