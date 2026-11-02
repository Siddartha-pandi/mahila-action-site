import fs from "fs/promises";
import path from "path";

export interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
}

export const CATEGORIES_FILE = path.join(process.cwd(), "src", "data", "categories.json");

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "1", name: "Women & Leadership" },
  { id: "2", name: "Education & Learning" },
  { id: "3", name: "Livelihood & Skills" },
  { id: "4", name: "Community Wellbeing" },
];

/**
 * Reads categories directly from src/data/categories.json,
 * falling back to DEFAULT_CATEGORIES if the file doesn't exist yet.
 */
export async function readCategoriesFile(): Promise<CategoryItem[]> {
  try {
    const raw = await fs.readFile(CATEGORIES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((c) => ({
        id: String(c.id),
        name: String(c.name || "").trim(),
        ...(c.slug ? { slug: String(c.slug) } : {}),
      }));
    }
  } catch {}
  return DEFAULT_CATEGORIES;
}

/**
 * Writes categories array back to src/data/categories.json.
 */
export async function writeCategoriesFile(categories: CategoryItem[]): Promise<void> {
  await fs.mkdir(path.dirname(CATEGORIES_FILE), { recursive: true });
  await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2), "utf-8");
}

/**
 * Computes the next sequential numeric ID for a new category (e.g. 1, 2, 3, 4 -> 5).
 */
export function getNextCategoryId(categories: CategoryItem[]): string {
  const numericIds = categories
    .map((c) => Number(c.id))
    .filter((n) => !isNaN(n) && Number.isInteger(n) && n > 0);
  const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  return String(nextId);
}

