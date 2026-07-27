import pkg from "pg";
const { Pool } = pkg;
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;
  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await pool.query(schema);

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
    isInitialized = true;
    console.log("PostgreSQL database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL database:", err);
    throw err;
  }
}

export default pool;
