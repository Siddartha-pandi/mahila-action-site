import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

let pool: any = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let isUsingSqliteFallback = false;

function createSqlitePool() {
  const dataDir = path.join(process.cwd(), "src/data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const { createRequire } = require("node:module");
  const req = createRequire(import.meta.url || __filename);
  const Database = req("better-sqlite3");
  const dbPath = process.env.DB_PATH || path.join(dataDir, "mahila.db");
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");

  return {
    query: async (text: string, params: any[] = []) => {
      const sqliteParams: any[] = [];
      const convertedSql = text
        .replace(/\$(\d+)/g, (_, numStr) => {
          const idx = parseInt(numStr, 10) - 1;
          if (params && idx >= 0 && idx < params.length) {
            sqliteParams.push(params[idx]);
          } else {
            sqliteParams.push(null);
          }
          return "?";
        })
        .replace(/::text/g, "");

      const isSelectOrReturning = /^\s*(SELECT|WITH)|RETURNING/i.test(convertedSql);
      if (isSelectOrReturning) {
        const cleanedSql = convertedSql.replace(/\s+RETURNING\s+[\w\*,\s]+$/i, "");
        const stmt = sqliteDb.prepare(cleanedSql);
        const rows = stmt.all(...sqliteParams);
        return { rows, rowCount: rows.length };
      } else {
        const stmt = sqliteDb.prepare(convertedSql);
        const info = stmt.run(...sqliteParams);
        return { rows: [], rowCount: info.changes };
      }
    },
    isSqlite: true,
  };
}

export async function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !isUsingSqliteFallback) {
    try {
      const pkg = await import("pg");
      const { Pool } = pkg.default || pkg;

      // Replace sslmode=require with sslmode=verify-full to prevent Node security warning
      const cleanUrl = databaseUrl.replace("sslmode=require", "sslmode=verify-full");
      const useSsl =
        process.env.DATABASE_SSL === "true" ||
        cleanUrl.includes("sslmode=") ||
        cleanUrl.includes("neon.tech") ||
        cleanUrl.includes("postgres.database.azure.com");

      const pgPool = new Pool({
        connectionString: cleanUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000, // 4s timeout for fast connection test
      });

      // Handle background socket errors cleanly without crashing process
      pgPool.on("error", (err: any) => {
        console.error("PostgreSQL pool background error:", err?.message || err);
      });

      pool = pgPool;
      return pool;
    } catch (err) {
      console.warn("⚠️ Failed to connect to PostgreSQL. Switching to local SQLite database.", err);
      isUsingSqliteFallback = true;
      pool = createSqlitePool();
      return pool;
    }
  }

  isUsingSqliteFallback = true;
  pool = createSqlitePool();
  return pool;
}

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
      let currentPool = await getPool();
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

      // Test PostgreSQL connection probe if attempting PG
      if (!isUsingSqliteFallback && currentPool) {
        try {
          await currentPool.query("SELECT 1");
        } catch (pgErr: any) {
          console.warn(
            "⚠️ Azure PostgreSQL connection timed out / blocked by firewall:",
            pgErr?.message || pgErr
          );
          console.warn("⚠️ Switching to local SQLite database fallback for uninterrupted operation.");
          isUsingSqliteFallback = true;
          pool = createSqlitePool();
          currentPool = pool;
        }
      }

      if (isUsingSqliteFallback) {
        // Execute SQLite schema
        const sqliteSchema = rawSchema
          .replace(/TIMESTAMPTZ/g, "TEXT")
          .replace(/NOW\(\)/g, "CURRENT_TIMESTAMP")
          .replace(/SERIAL PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT")
          .replace(/DOUBLE PRECISION/g, "REAL")
          .replace(/::text/g, "");

        const statements = sqliteSchema
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);

        for (const statement of statements) {
          try {
            await currentPool.query(statement);
          } catch {}
        }

        // Ensure newly added columns exist in pre-existing SQLite databases
        try {
          await currentPool.query("ALTER TABLE users ADD COLUMN kind TEXT;");
        } catch {}
        try {
          await currentPool.query("ALTER TABLE users ADD COLUMN permissions TEXT;");
        } catch {}
      } else {
        // Run PostgreSQL schema & migrations
        await currentPool.query(rawSchema);
        try {
          await currentPool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;");
        } catch {}
        try {
          await currentPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS kind TEXT;");
        } catch {}
        try {
          await currentPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT;");
        } catch {}
      }

      // Seed default categories
      await currentPool.query(`
        INSERT INTO cms_categories (id, name) VALUES 
          ('cat_women', 'Women & Leadership'),
          ('cat_education', 'Education & Learning'),
          ('cat_livelihood', 'Livelihood & Skills'),
          ('cat_wellbeing', 'Community Wellbeing')
        ON CONFLICT (id) DO NOTHING
      `);

      // Seed default superadmin user into unified users table
      const superadminEmail = (
        process.env.SUPERADMIN_EMAIL ||
        process.env.EMAIL_FROM ||
        "mahilaaction.vsk@gmail.com"
      ).toLowerCase().trim();
      const superadminPassword = process.env.SUPERADMIN_PASSWORD || "1980Jan23";

      const bcrypt = (await import("bcryptjs")).default;
      const adminPasswordHash = await bcrypt.hash(superadminPassword, 10);
      await currentPool.query(
        `INSERT INTO users (id, name, email, role, password_hash, status)
         VALUES ('admin_user_1', 'Lead Super Admin', $1, 'superadmin', $2, 'Active')
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'superadmin', status = 'Active'`,
        [superadminEmail, adminPasswordHash]
      );

      isInitialized = true;
      console.log(
        isUsingSqliteFallback
          ? "SQLite database initialized & migrated successfully."
          : "PostgreSQL database initialized & migrated successfully."
      );
    } catch (err) {
      console.error("Failed to initialize database:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function queryDb(text: string, params: any[] = []) {
  // Bypass live queries during Next.js static build phase
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
