import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

let pool: any;

<<<<<<< Updated upstream
if (process.env.DATABASE_URL) {
<<<<<<< HEAD
  // PostgreSQL (Neon / Supabase / standard PG)
=======
export async function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required. SQLite fallback is disabled.");
  }

>>>>>>> Stashed changes
=======
  // PostgreSQL (Neon / Supabase / standard PG / Azure)
>>>>>>> 6292fead7186170bd28a52c7befb43600a8d6d7c
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
<<<<<<< Updated upstream
} else {
<<<<<<< HEAD
  // SQLite fallback
  const Database = (await import("better-sqlite3")).default;
  const dbPath = process.env.DB_PATH || path.join(dataDir, "mahila.db");
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");

  pool = {
    query: async (text: string, params: any[] = []) => {
      const sql = text.replace(/\$\d+/g, "?").replace(/::text/g, "");
      const isSelect = /^\s*SELECT/i.test(sql);
      if (isSelect) {
        const stmt = sqliteDb.prepare(sql);
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const stmt = sqliteDb.prepare(sql);
        const info = stmt.run(...params);
        return { rows: [], rowCount: info.changes };
      }
    },
  };
=======

  return pool;
>>>>>>> Stashed changes
=======
  throw new Error("DATABASE_URL environment variable is required. SQLite fallback is disabled.");
>>>>>>> 6292fead7186170bd28a52c7befb43600a8d6d7c
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

<<<<<<< HEAD
<<<<<<< Updated upstream
    if (process.env.DATABASE_URL) {
      await pool.query(rawSchema);
    } else {
      const sqlStatements = rawSchema
        .replace(/::text/g, "")
        .replace(/DOUBLE PRECISION/g, "REAL")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of sqlStatements) {
        await pool.query(statement);
      }
    }

    // Migration: submission tables predate the review-status column, and
    // CREATE TABLE IF NOT EXISTS won't add it to a database that already
    // exists. Each ALTER is attempted independently so one failure (or an
    // engine without IF NOT EXISTS support) can't abort initialisation.
    const statusTables = [
      "donations",
      "event_reservations",
      "vendor_registrations",
      "volunteer_accounts",
      "volunteer_registrations",
      "contact_submissions",
    ];
    for (const table of statusTables) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'New'`);
      } catch {
        try {
          await pool.query(`ALTER TABLE ${table} ADD COLUMN status TEXT NOT NULL DEFAULT 'New'`);
        } catch {
          // Column already present — nothing to do.
        }
      }
    }
=======
    // Run the schema against PostgreSQL pool
    await currentPool.query(rawSchema);
>>>>>>> Stashed changes
=======
    // Run the schema against PostgreSQL pool
    await pool.query(rawSchema);
>>>>>>> 6292fead7186170bd28a52c7befb43600a8d6d7c

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
<<<<<<< Updated upstream
    await pool.query(
<<<<<<< HEAD
      `INSERT INTO app_admin_users (id, email, password_hash)
       VALUES ('admin_user_1', 'mahilaaction.vsk@gmail.com', $1)
       ON CONFLICT (id) DO UPDATE SET email = 'mahilaaction.vsk@gmail.com', password_hash = $1`,
=======
    await currentPool.query(
      `INSERT INTO users (id, name, email, role, password_hash, status)
       VALUES ('admin_user_1', 'Lead Super Admin', 'mahilaaction.vsk@gmail.com', 'superadmin', $1, 'Active')
       ON CONFLICT (id) DO UPDATE SET email = 'mahilaaction.vsk@gmail.com', password_hash = $1, role = 'superadmin'`,
>>>>>>> Stashed changes
=======
      `INSERT INTO users (id, name, email, role, password_hash, status)
       VALUES ('admin_user_1', 'Lead Super Admin', 'mahilaaction.vsk@gmail.com', 'superadmin', $1, 'Active')
       ON CONFLICT (id) DO UPDATE SET email = 'mahilaaction.vsk@gmail.com', password_hash = $1, role = 'superadmin'`,
>>>>>>> 6292fead7186170bd28a52c7befb43600a8d6d7c
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
