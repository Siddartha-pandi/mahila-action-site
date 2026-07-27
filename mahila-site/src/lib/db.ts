import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const dataDir = path.join(process.cwd(), "src/data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let pool: any;

if (process.env.DATABASE_URL) {
  // PostgreSQL (Neon / Supabase / standard PG)
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

    const bcrypt = (await import("bcryptjs")).default;
    const adminPasswordHash = bcrypt.hashSync("1980Jan23", 10);
    await pool.query(
      `INSERT INTO app_admin_users (id, email, password_hash)
       VALUES ('admin_user_1', 'mahilaaction.vsk@gmail.com', $1)
       ON CONFLICT (id) DO UPDATE SET email = 'mahilaaction.vsk@gmail.com', password_hash = $1`,
      [adminPasswordHash]
    );

    isInitialized = true;
    console.log("Database initialized successfully.");
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
