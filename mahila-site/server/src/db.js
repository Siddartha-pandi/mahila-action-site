import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || "./data/mahila.db";

// Make sure the directory for the sqlite file exists (e.g. ./data)
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Lightweight migrations for columns added after a table already existed —
// CREATE TABLE IF NOT EXISTS above is a no-op once the table is there, so any
// new column needs to be added explicitly for databases created before it existed.
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("volunteer_accounts", "reset_token_hash", "TEXT");
ensureColumn("volunteer_accounts", "reset_token_expires", "TEXT");

// Seed default categories if none exist yet. These IDs match the fallback
// content in src/lib/data.ts on the frontend, so posts created via the admin
// panel using these categories satisfy the cms_blog_posts foreign key.
const defaultCategories = [
  { id: "cat_women", name: "Women & Leadership" },
  { id: "cat_education", name: "Education & Learning" },
  { id: "cat_livelihood", name: "Livelihood & Skills" },
  { id: "cat_wellbeing", name: "Community Wellbeing" },
];
const insertCategory = db.prepare(
  "INSERT OR IGNORE INTO cms_categories (id, name) VALUES (?, ?)"
);
for (const cat of defaultCategories) {
  insertCategory.run(cat.id, cat.name);
}

export default db;
