import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { FALLBACK_SCHEMA_SQL } from "./schemaSql";

dotenv.config();

// Global cache to persist pool & initialization state across Next.js reloads
const globalRef = globalThis as any;

let pool: any = globalRef._pgPool || null;
let isInitialized = globalRef._dbInitialized || false;
let initPromise: Promise<void> | null = globalRef._dbInitPromise || null;

// High-speed query cache for SELECT queries (15-second TTL, auto-invalidated on write)
const queryCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 15000; // 15s cache for lightning fast responses

export function clearQueryCache() {
  queryCache.clear();
}

export async function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. PostgreSQL is the only supported database.");
  }

  const pkg = await import("pg");
  const { Pool } = pkg.default || pkg;

  // Clean URL parameters that can cause node-postgres SCRAM / SSL handshake issues on serverless
  const cleanUrl = databaseUrl
    .replace(/([?&])channel_binding=[^&]*(&|$)/g, "$1")
    .replace(/([?&])sslmode=[^&]*(&|$)/g, "$1")
    .replace(/[?&]$/, "");

  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    databaseUrl.includes("sslmode=") ||
    databaseUrl.includes("neon.tech") ||
    databaseUrl.includes("postgres.database.azure.com");

  const pgPool = new Pool({
    connectionString: cleanUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: process.env.NODE_ENV === "production" ? 4 : 10,
    min: 0,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
  });

  pgPool.on("error", (err: any) => {
    console.error("PostgreSQL pool background error:", err?.message || err);
  });

  pool = pgPool;
  globalRef._pgPool = pool;
  return pool;
}

const APP_META_PATH = path.join(process.cwd(), "src", "data", "app_meta.json");

export function getAppMeta(key?: string): any {
  try {
    if (fs.existsSync(APP_META_PATH)) {
      const content = fs.readFileSync(APP_META_PATH, "utf-8");
      const data = JSON.parse(content);
      return key ? data[key] ?? null : data;
    }
  } catch (err) {
    console.warn("Failed to read app_meta.json:", err);
  }
  return key ? null : {};
}

export function setAppMeta(key: string, value: any): void {
  try {
    const data = getAppMeta() || {};
    data[key] = value;
    data.updated_at = new Date().toISOString();
    const dir = path.dirname(APP_META_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(APP_META_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write to app_meta.json:", err);
  }
}

// Marker recording which schema.sql has already been applied. Startup
// compares it against a hash of the current file, so the ~50 schema and seed
// statements only run when something actually changed. Stored in JSON format
// (src/data/app_meta.json) to eliminate unnecessary DB queries.
const SCHEMA_MARKER_KEY = "__schema_version";

function schemaFingerprint(rawSchema: string): string {
  return crypto.createHash("sha256").update(rawSchema).digest("hex").slice(0, 16);
}

function readAppliedSchemaVersion(): string | null {
  return getAppMeta(SCHEMA_MARKER_KEY);
}

function recordSchemaVersion(version: string): void {
  setAppMeta(SCHEMA_MARKER_KEY, version);
}

/**
 * Superadmin credentials live in environment variables and must never be stored
 * in the database. This runs on every start, including the fast path, so a row
 * inserted by hand cannot survive a restart.
 */
async function removeSuperadminRows(dbPool: any): Promise<void> {
  const superadminEmail = (
    process.env.SUPERADMIN_EMAIL ||
    process.env.EMAIL_FROM ||
    ""
  ).toLowerCase().trim();

  if (superadminEmail) {
    await dbPool.query(
      `DELETE FROM users WHERE role = 'superadmin' OR LOWER(email) = LOWER($1)`,
      [superadminEmail]
    );
  } else {
    await dbPool.query(`DELETE FROM users WHERE role = 'superadmin'`);
  }
}

/** Builds a `($1, $2, ...), ($n, ...)` placeholder list for a multi-row insert. */
function rowPlaceholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, (_, row) =>
    `(${Array.from({ length: columnCount }, (_, col) => `$${row * columnCount + col + 1}`).join(", ")})`
  ).join(", ");
}

export async function seedAllData(dbPool: any, options?: { force?: boolean }): Promise<void> {
  // Categories are now managed in JSON format (src/data/categories.json)
  // Map category code strings to integer IDs
  const catMap: Record<string, number> = {
    cat_women: 1,
    cat_education: 2,
    cat_livelihood: 3,
    cat_wellbeing: 4,
  };

  // 2. Superadmin is authenticated via environment variables and must never be
  // stored in the database. Also runs on the fast path — see removeSuperadminRows.
  await removeSuperadminRows(dbPool);

  const isForce = Boolean(options?.force);

  // 3. Events are user-created via Admin Center CMS; do not auto-seed dummy events.
  // This prevents deleted events from being automatically restored on startup.

  // 4. Default Impact Stories (IDs: 7..10) — used for "Our Impact" core pillars
  const blogPosts = [
    {
      id: 7,
      section: "impact",
      categoryId: 1,
      title: "When Women Rise, Communities Thrive.",
      excerpt: "Women & Leadership — grassroots training, civic engagement, and mentorship that puts women in decision-making roles.",
      content: "<p>Mahila Action's Women &amp; Leadership programme has been transforming the civic and economic landscape of rural Telangana for over two decades. We believe lasting change begins when women take their rightful place as decision-makers in their homes, communities, and institutions.</p><h2>1. Grassroots Leadership Training</h2><p>Our flagship 12-week leadership training immerses women in modules covering public speaking, conflict resolution, rights awareness, and community organising. Over 3,000 women have completed the programme since 2005, with 500+ now holding elected positions in local governance.</p><h2>2. Civic Engagement &amp; Panchayat Access</h2><p>We prepare women to actively engage with panchayat processes — from attending gram sabhas to filing RTI applications. Our legal literacy workshops have helped over 1,200 women access entitlements they previously didn't know existed.</p><h2>3. Mentorship Networks</h2><p>We connect emerging women leaders with experienced advocates who guide them through the challenges of public life. These networks have proven to be one of the most powerful tools for sustained participation and confidence-building.</p><h2>4. Young Women's Councils</h2><p>Recognising that leadership starts early, we run Young Women's Councils in 45 schools across Nalgonda and Warangal districts — giving girls a safe space to practise leadership, debate, and civic advocacy.</p><h2>5. Impact in Numbers</h2><p>500+ women in elected leadership positions · 3,000+ trained leaders · 1,200+ RTI applications filed successfully · 45 Young Women's Councils active in schools.</p>",
      coverImage: "",
      gallery: [],
      tags: [],
    },
    {
      id: 8,
      section: "impact",
      categoryId: 2,
      title: "Education Opens New Possibilities.",
      excerpt: "Education & Learning — community centres, adult literacy, and scholarships that keep girls in school.",
      content: "<p>Access to quality education remains one of the most persistent inequities facing women and children in rural India. Mahila Action's Education &amp; Learning programmes work at every stage — from early childhood literacy to adult continuing education.</p><h2>1. Community Learning Centres</h2><p>We operate 38 community learning centres serving over 12,000 students annually. Located in brick-kiln colonies, tribal hamlets, and urban slums, these centres provide remedial tutoring, life skills, and a safe after-school environment.</p><h2>2. Adult Literacy Circles</h2><p>Our adult literacy programme — where Mahila Action began in 1995 — continues to run literacy circles for women who never had the opportunity to complete schooling. To date, we have helped over 8,000 women achieve functional literacy.</p><h2>3. Scholarships &amp; Retention Support</h2><p>We provide annual scholarships to 400 girls at risk of school dropout due to economic pressure or early marriage. Our retention coordinators follow up monthly with families to resolve barriers and keep girls in school.</p><h2>4. Teacher Training &amp; Curriculum</h2><p>We work with government school teachers to improve pedagogy around girls' education. Our supplemental curriculum on gender equality has been adopted by 120 government schools across four districts.</p><h2>5. Impact in Numbers</h2><p>38 community learning centres · 12,000+ students served annually · 8,000+ adult women made literate · 400 scholarships awarded each year.</p>",
      coverImage: "",
      gallery: [],
      tags: [],
    },
    {
      id: 9,
      section: "impact",
      categoryId: 3,
      title: "Building Economic Independence Together.",
      excerpt: "Livelihood & Skills — vocational training, SHG networks, and market access that build lasting income.",
      content: "<p>Economic dependency is one of the primary barriers to women's freedom and dignity. Mahila Action's Livelihood &amp; Skills programmes build sustainable income pathways through vocational training, micro-enterprise support, and access to financial services.</p><h2>1. Vocational Skills Training</h2><p>We offer certified vocational programmes in tailoring, food processing, beauty therapy, construction trades, and digital skills. Over 6,000 women have completed vocational training, with 78% reporting increased household income within six months.</p><h2>2. Micro-Finance &amp; SHG Networks</h2><p>Our self-help group (SHG) federation connects over 4,200 women in 210 SHGs across 14 districts. Members access affordable credit, savings facilities, and insurance products tailored to their needs.</p><h2>3. Market Linkages &amp; Entrepreneurship</h2><p>We connect trained women with market opportunities — from e-commerce platforms to B2B buyers and government procurement programmes. Our annual Livelihood Skills Fair brings together 500+ women entrepreneurs with corporate buyers and mentors.</p><h2>4. Digital Financial Literacy</h2><p>In partnership with banking institutions, we have trained 5,000+ women in mobile banking, UPI transactions, and digital record-keeping — enabling them to manage businesses and savings with greater confidence.</p><h2>5. Impact in Numbers</h2><p>6,000+ women trained in vocational skills · 4,200 women in 210 SHGs · 78% report income increase post-training · ₹12 crore in micro-credit disbursed annually.</p>",
      coverImage: "",
      gallery: [],
      tags: [],
    },
    {
      id: 10,
      section: "impact",
      categoryId: 4,
      title: "Health and Dignity for Every Family.",
      excerpt: "Community Wellbeing — mobile health camps, nutrition, and survivor support for women and families.",
      content: "<p>True empowerment requires physical safety and good health. Mahila Action's Community Wellbeing programmes address the healthcare access gap facing women and children through mobile clinics, health education, and survivor support services.</p><h2>1. Mobile Health Camps</h2><p>Our fleet of mobile health units visits 80 remote villages and urban slums every quarter, offering free screenings for anaemia, malnutrition, cervical cancer, and maternal health. Over 25,000 consultations are conducted annually.</p><h2>2. Maternal &amp; Child Nutrition</h2><p>We partner with government ASHA workers to identify and support malnourished children and pregnant women. Our nutrition programme has contributed to a 42% reduction in severe malnutrition in targeted communities over five years.</p><h2>3. Domestic Violence Support</h2><p>Our trauma-informed support services provide counselling, legal aid, and safe shelter referrals to survivors of gender-based violence. Last year, we supported 1,100 women across all four districts we operate in.</p><h2>4. Mental Health Awareness</h2><p>Following COVID-19, we launched community mental health awareness sessions and trained 350 community health volunteers in psychological first aid and suicide prevention protocols.</p><h2>5. Impact in Numbers</h2><p>25,000+ health consultations annually · 42% reduction in severe malnutrition in target areas · 1,100 GBV survivors supported · 350 mental health volunteers trained.</p>",
      coverImage: "",
      gallery: [],
      tags: [],
    },
  ];

  const postConflict = isForce
    ? "DO UPDATE SET section = EXCLUDED.section, category_id = EXCLUDED.category_id, title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content, cover_image = EXCLUDED.cover_image, gallery = EXCLUDED.gallery, tags = EXCLUDED.tags"
    : "DO NOTHING";

  // One multi-row insert rather than one round trip per post.
  await dbPool.query(
    `INSERT INTO blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
     VALUES ${rowPlaceholders(blogPosts.length, 9)}
     ON CONFLICT (id) ${postConflict}`,
    blogPosts.flatMap((post) => [
      post.id,
      post.section,
      post.categoryId,
      post.title,
      post.excerpt,
      post.content,
      post.coverImage,
      JSON.stringify(post.gallery),
      JSON.stringify(post.tags),
    ])
  );

  // Self-heal impact posts category IDs if they were previously unassigned/null in database
  try {
    await dbPool.query(`
      UPDATE blog_posts SET category_id = 1 WHERE section = 'impact' AND LOWER(title) LIKE '%women%' AND (category_id IS NULL OR category_id = 0);
      UPDATE blog_posts SET category_id = 2 WHERE section = 'impact' AND LOWER(title) LIKE '%education%' AND (category_id IS NULL OR category_id = 0);
      UPDATE blog_posts SET category_id = 3 WHERE section = 'impact' AND (LOWER(title) LIKE '%economic%' OR LOWER(title) LIKE '%livelihood%') AND (category_id IS NULL OR category_id = 0);
      UPDATE blog_posts SET category_id = 4 WHERE section = 'impact' AND (LOWER(title) LIKE '%health%' OR LOWER(title) LIKE '%wellbeing%') AND (category_id IS NULL OR category_id = 0);
    `);
  } catch { }

  // Synchronize PostgreSQL SERIAL sequences past manually seeded IDs
  await syncAllSequences(dbPool);
}

/**
 * Synchronizes all PostgreSQL SERIAL sequences to be at least MAX(id).
 * This prevents unique constraint violations (e.g. duplicate key value violates unique constraint "media_pkey")
 * when rows have been manually inserted or seeded with explicit IDs.
 */
export async function syncAllSequences(pool?: any): Promise<void> {
  const currentPool = pool || (await getPool());
  const tables = [
    "users",
    "events",
    "blog_posts",
    "donations",
    "event_reservations",
    "contact_submissions",
    "perm_volunteer_requests",
    "recycle_bin",
    "media",
  ];

  for (const t of tables) {
    try {
      await currentPool.query(`
        SELECT CASE
          WHEN (SELECT MAX(id) FROM ${t}) IS NOT NULL AND (SELECT MAX(id) FROM ${t}) > 0
          THEN setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}), true)
          ELSE setval(pg_get_serial_sequence('${t}', 'id'), 1, false)
        END;
      `);
    } catch { }
  }
}

/**
 * Safely reserves and returns the next ID from a table's SERIAL sequence.
 * Guarantees that the returned ID is strictly greater than any existing ID in the table,
 * automatically resynchronizing the sequence if it is lagging behind existing rows.
 */
export async function getNextSafeSequenceId(
  tableName: string,
  idColumn: string = "id"
): Promise<number> {
  const identPattern = /^[a-zA-Z0-9_]+$/;
  if (!identPattern.test(tableName) || !identPattern.test(idColumn)) {
    throw new Error(`Invalid database table or column identifier: ${tableName}.${idColumn}`);
  }

  try {
    // 1. Check current MAX(id) in the table
    const maxRes = await queryDb(
      `SELECT COALESCE(MAX(${idColumn}), 0) AS max_id FROM ${tableName}`
    );
    const maxId = Number(maxRes.rows[0]?.max_id) || 0;

    // 2. Fetch the sequence's next value
    const seqRes = await queryDb(
      `SELECT nextval(pg_get_serial_sequence($1, $2)) AS next_id`,
      [tableName, idColumn]
    );
    let nextId = Number(seqRes.rows[0]?.next_id);

    // 3. If nextId is missing, NaN, or <= maxId, the sequence is lagging behind existing IDs.
    // Atomically synchronize the sequence to maxId, then re-fetch nextval (guaranteed > maxId).
    if (!Number.isFinite(nextId) || nextId <= maxId) {
      const syncVal = Math.max(maxId, 1);
      await queryDb(
        `SELECT setval(pg_get_serial_sequence($1, $2), $3, true)`,
        [tableName, idColumn, syncVal]
      );
      const reSeqRes = await queryDb(
        `SELECT nextval(pg_get_serial_sequence($1, $2)) AS next_id`,
        [tableName, idColumn]
      );
      nextId = Number(reSeqRes.rows[0]?.next_id);
    }

    if (Number.isFinite(nextId) && nextId > 0) {
      return nextId;
    }
  } catch (err) {
    console.warn(`getNextSafeSequenceId warning for ${tableName}.${idColumn}:`, err);
  }

  // 4. Safe fallback if sequence cannot be queried
  try {
    const maxRes = await queryDb(
      `SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS next_id FROM ${tableName}`
    );
    const fallbackId = Number(maxRes.rows[0]?.next_id) || 1;
    try {
      await queryDb(
        `SELECT setval(pg_get_serial_sequence($1, $2), $3, true)`,
        [tableName, idColumn, fallbackId]
      );
    } catch { }
    return fallbackId;
  } catch {
    return 1;
  }
}

export async function initDb(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  // Bypass database initialization during Next.js static build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("Next.js build phase detected. Skipping database initialization.");
    isInitialized = true;
    globalRef._dbInitialized = true;
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
        rawSchema = FALLBACK_SCHEMA_SQL;
      }

      await currentPool.query("SELECT 1");
      console.log("✓ Connected to PostgreSQL database successfully.");

      const cleanRawSchema = rawSchema
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

      // Applying the schema and seed costs one network round trip per statement
      // — around fifty of them. Once a given schema.sql has been applied there is
      // nothing left to do, so check a marker row first and skip the whole thing.
      // Verify if the database actually has the required tables. If the database
      // was reset or is fresh, apply the schema even if app_meta.json has a cached hash.
      const tableCheck = await currentPool
        .query("SELECT to_regclass('public.users') as regclass")
        .catch(() => ({ rows: [] }));
      const hasTables = Boolean(tableCheck.rows[0]?.regclass);

      const schemaVersion = schemaFingerprint(rawSchema);
      let appliedVersion = readAppliedSchemaVersion();

      if (!appliedVersion && hasTables) {
        try {
          const vRes = await currentPool.query(
            "SELECT value FROM site_settings WHERE key = $1 LIMIT 1",
            [SCHEMA_MARKER_KEY]
          );
          if (vRes.rows && vRes.rows.length > 0 && vRes.rows[0].value) {
            appliedVersion = vRes.rows[0].value;
          }
        } catch {}
      }

      if (hasTables && appliedVersion === schemaVersion) {
        await removeSuperadminRows(currentPool).catch(() => { });
        await currentPool.query(
          `DELETE FROM events WHERE id = 1 AND LOWER(title) = 'community leadership workshop' AND NOT EXISTS (SELECT 1 FROM event_reservations WHERE event_id = 1)`
        ).catch(() => {});
        await currentPool.query(`
          DELETE FROM blog_posts 
          WHERE (section = 'story' AND (id IN (1, 2, 3, 4, 5, 6) OR LOWER(TRIM(title)) IN ('she found her voice', 'a new dawn for priya', 'building futures together', 'health for all', 'first woman sarpanch', 'breaking the cycle')))
             OR (section = 'event' AND id IN (11, 12));
        `).catch(() => {});
        await syncAllSequences(currentPool).catch(() => { });
        isInitialized = true;
        globalRef._dbInitialized = true;
        console.log("✓ PostgreSQL database already up to date.");
        return;
      }

      // PostgreSQL schema. Every statement is idempotent (IF NOT EXISTS), so
      // they go out as a single batch instead of one round trip each.
      const statements = [
        ...cleanRawSchema.split(";").map((s) => s.trim()).filter(Boolean),
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kind TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT",
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS category_id TEXT",
        "ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_id_fkey",
        "ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_id_fkey",
        "DROP TABLE IF EXISTS categories CASCADE",
        "DROP TABLE IF EXISTS cms_categories CASCADE",
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS max_volunteers INTEGER DEFAULT 0",
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE",
        "ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS pan_number TEXT",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS address TEXT",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'upi'",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS transaction_id TEXT",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_number TEXT",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT FALSE",
        "ALTER TABLE event_reservations ADD COLUMN IF NOT EXISTS event_id INTEGER",
        "DROP TABLE IF EXISTS contact CASCADE",
        "DROP TABLE IF EXISTS cms_contact CASCADE",
        "DROP TABLE IF EXISTS app_meta CASCADE",
        "DROP TABLE IF EXISTS site_content CASCADE",
        "DROP TABLE IF EXISTS councilors CASCADE",
        "DROP TABLE IF EXISTS timeline CASCADE",
        "DROP TABLE IF EXISTS cms_councilors CASCADE",
        "DROP TABLE IF EXISTS cms_timeline CASCADE",
        "ALTER TABLE media ALTER COLUMN data DROP NOT NULL",
        "ALTER TABLE media ALTER COLUMN byte_size TYPE BIGINT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS url TEXT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS url_hash TEXT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS thumbnail_url TEXT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb",
        "CREATE INDEX IF NOT EXISTS media_url_hash_idx ON media (url_hash)",
        "UPDATE media SET url_hash = encode(sha256(COALESCE(url, '/api/media/' || id)::bytea), 'hex') WHERE url_hash IS NULL OR url_hash = ''",
        "CREATE INDEX IF NOT EXISTS media_media_type_idx ON media (media_type)",
        // ── Neon Object Storage columns (storage-migration.sql) ────────────────
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS uuid TEXT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS object_key TEXT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS bucket_name TEXT",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'",
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_visibility_check') THEN ALTER TABLE media ADD CONSTRAINT media_visibility_check CHECK (visibility IN ('public', 'private')); END IF; END; $$`,
        "CREATE INDEX IF NOT EXISTS media_uuid_idx ON media (uuid)",
        "CREATE INDEX IF NOT EXISTS media_object_key_idx ON media (object_key)",
        "CREATE INDEX IF NOT EXISTS media_visibility_idx ON media (visibility)",
        "CREATE INDEX IF NOT EXISTS media_bucket_name_idx ON media (bucket_name)",
        "CREATE INDEX IF NOT EXISTS media_storage_gallery_idx ON media (visibility, media_type, created_at DESC) WHERE object_key IS NOT NULL",
        "UPDATE media SET visibility = 'public' WHERE visibility IS NULL OR visibility = ''",
        `CREATE OR REPLACE VIEW storage_images AS SELECT id, uuid, filename, mime_type, byte_size, object_key, bucket_name, visibility, url, thumbnail_url, media_type, metadata, created_at FROM media WHERE object_key IS NOT NULL ORDER BY created_at DESC`,
      ];

      try {
        await currentPool.query(statements.join(";\n") + ";");
      } catch (batchErr: any) {
        // A batch aborts at the first failure, so fall back to running them
        // one by one — slower, but it recovers the previous behaviour of
        // letting a single bad statement pass without stopping the rest.
        console.warn("Batched schema apply failed, retrying statement by statement:", batchErr?.message || batchErr);
        for (const statement of statements) {
          try {
            await currentPool.query(statement);
          } catch { }
        }
      }

      // Seed all default data into database
      await seedAllData(currentPool);
      await currentPool.query(`
        DELETE FROM blog_posts 
        WHERE (section = 'story' AND (id IN (1, 2, 3, 4, 5, 6) OR LOWER(TRIM(title)) IN ('she found her voice', 'a new dawn for priya', 'building futures together', 'health for all', 'first woman sarpanch', 'breaking the cycle')))
           OR (section = 'event' AND id IN (11, 12));
      `).catch(() => {});
      recordSchemaVersion(schemaVersion);
      try {
        await currentPool.query(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [SCHEMA_MARKER_KEY, schemaVersion]
        );
      } catch {}

      isInitialized = true;
      globalRef._dbInitialized = true;
      console.log("✓ PostgreSQL database initialized & seeded successfully.");
    } catch (err) {
      console.error("Failed to initialize database:", err);
      initPromise = null;
      globalRef._dbInitPromise = null;
      throw err;
    }
  })();

  globalRef._dbInitPromise = initPromise;
  return initPromise;
}

export async function queryDb(text: string, params: any[] = [], options?: { noCache?: boolean }) {
  // Bypass live queries during Next.js static build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { rows: [], rowCount: 0 };
  }

  const isSelect = /^\s*SELECT/i.test(text);
  const cacheKey = isSelect && !options?.noCache ? `${text}::${JSON.stringify(params)}` : "";

  // Return cached result if SELECT query is within TTL and noCache is not set
  if (isSelect && !options?.noCache) {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  } else {
    // Invalidate SELECT cache whenever a write query runs or cache is bypassed
    if (!isSelect) {
      clearQueryCache();
    }
  }

  if (!isInitialized) {
    await initDb();
  }

  let currentPool = await getPool();
  let res: any;
  try {
    res = await currentPool.query(text, params);
  } catch (err: any) {
    const isConnErr =
      err?.message?.includes("timeout") ||
      err?.message?.includes("closed") ||
      err?.code === "ECONNRESET" ||
      err?.code === "57P01";
    if (isConnErr) {
      console.warn("Retrying queryDb after connection reset:", err?.message || err);
      try {
        await currentPool.end();
      } catch {}
      pool = null;
      globalRef._pgPool = null;
      currentPool = await getPool();
      res = await currentPool.query(text, params);
    } else {
      throw err;
    }
  }

  // Store in cache for 15 seconds if SELECT query and caching not bypassed
  if (isSelect && !options?.noCache && res) {
    queryCache.set(cacheKey, { data: res, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return res;
}

export default pool;
