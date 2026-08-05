import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import dotenv from "dotenv";

dotenv.config();

// Global cache to persist pool & initialization state across Next.js reloads
const globalRef = globalThis as any;

let pool: any = globalRef._pgPool || null;
let isInitialized = globalRef._dbInitialized || false;
let initPromise: Promise<void> | null = globalRef._dbInitPromise || null;
let isUsingSqliteFallback = globalRef._isUsingSqliteFallback || false;

// High-speed query cache for SELECT queries (15-second TTL, auto-invalidated on write)
const queryCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 15000; // 15s cache for lightning fast responses

function clearQueryCache() {
  queryCache.clear();
}

function createSqlitePool() {
  const dataDir = path.join(process.cwd(), "src/data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const req = createRequire(import.meta.url);
  const Database = req("better-sqlite3");
  const dbPath = process.env.DB_PATH || path.join(dataDir, "mahila.db");
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("synchronous = NORMAL");
  sqliteDb.pragma("cache_size = -64000");
  sqliteDb.pragma("mmap_size = 268435456");
  sqliteDb.pragma("temp_store = MEMORY");

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
        min: 4, // Keep warm connections active to eliminate connection setup latency
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000, // 3s probe timeout
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        statement_timeout: 10000,
      });

      pgPool.on("error", (err: any) => {
        console.error("PostgreSQL pool background error:", err?.message || err);
      });

      pool = pgPool;
      globalRef._pgPool = pool;
      return pool;
    } catch (err) {
      console.warn("⚠️ Failed to initialize PostgreSQL pool:", err);
      if (process.env.DISABLE_SQLITE_FALLBACK === "true" || process.env.NODE_ENV === "production") {
        // In production, do not silently fallback to SQLite. Surface the error so deployment fails clearly.
        throw err;
      }
      isUsingSqliteFallback = true;
      globalRef._isUsingSqliteFallback = true;
      pool = createSqlitePool();
      globalRef._pgPool = pool;
      return pool;
    }
  }

  // If no DATABASE_URL is provided, in production we should not auto-fallback to SQLite.
  if (!databaseUrl && (process.env.NODE_ENV === "production" || process.env.DISABLE_SQLITE_FALLBACK === "true")) {
    throw new Error("DATABASE_URL is not set and SQLite fallback is disabled in this environment.");
  }

  isUsingSqliteFallback = true;
  globalRef._isUsingSqliteFallback = true;
  pool = createSqlitePool();
  globalRef._pgPool = pool;
  return pool;
}

// Marker row recording which schema.sql has already been applied. Startup
// compares it against a hash of the current file, so the ~50 schema and seed
// statements only run when something actually changed. Against a remote
// database every one of those statements costs a full network round trip.
const SCHEMA_MARKER_KEY = "__schema_version";

function schemaFingerprint(rawSchema: string): string {
  return crypto.createHash("sha256").update(rawSchema).digest("hex").slice(0, 16);
}

async function readAppliedSchemaVersion(dbPool: any): Promise<string | null> {
  try {
    const res = await dbPool.query("SELECT value FROM app_meta WHERE key = $1", [SCHEMA_MARKER_KEY]);
    return res.rows[0]?.value ?? null;
  } catch {
    // app_meta does not exist yet — this is a first boot.
    return null;
  }
}

async function recordSchemaVersion(dbPool: any, version: string): Promise<void> {
  await dbPool.query(
    `INSERT INTO app_meta (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [SCHEMA_MARKER_KEY, version]
  );
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
    "mahilaaction.vsk@gmail.com"
  ).toLowerCase().trim();

  await dbPool.query(
    `DELETE FROM users WHERE role = 'superadmin' OR LOWER(email) = LOWER($1)`,
    [superadminEmail]
  );
}

/** Builds a `($1, $2, ...), ($n, ...)` placeholder list for a multi-row insert. */
function rowPlaceholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, (_, row) =>
    `(${Array.from({ length: columnCount }, (_, col) => `$${row * columnCount + col + 1}`).join(", ")})`
  ).join(", ");
}

export async function seedAllData(dbPool: any): Promise<void> {
  // 1. Categories (IDs: 1, 2, 3, 4)
  await dbPool.query(`
    INSERT INTO cms_categories (id, name) VALUES 
      (1, 'Women & Leadership'),
      (2, 'Education & Learning'),
      (3, 'Livelihood & Skills'),
      (4, 'Community Wellbeing')
    ON CONFLICT (id) DO NOTHING
  `);

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

  // 3. Default Events (ID: 1)
  const defaultWindows = [
    { kind: "volunteer", enabled: true, regStart: "2026-07-01", regEnd: "2026-08-14" },
    { kind: "vendor", enabled: true, regStart: "2026-07-01", regEnd: "2026-08-18" },
    { kind: "donor", enabled: true, regStart: "2026-07-01", regEnd: "2026-08-10" },
  ];
  await dbPool.query(
    `INSERT INTO cms_events (id, title, description, image, event_date, location, total_seats, windows, category_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      1,
      "Community Leadership Workshop",
      "A hands-on workshop building confidence, public speaking, and civic leadership skills for women in the community.",
      "",
      "2026-08-21",
      "Hyderabad",
      45,
      JSON.stringify(defaultWindows),
      1,
    ]
  );

  // 4. Default Blog Posts & Impact Stories (IDs: 1..10)
  const blogPosts = [
    { id: 1, section: "story", categoryId: 1, title: "She Found Her Voice", excerpt: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", content: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", coverImage: "", gallery: [], tags: [] },
    { id: 2, section: "story", categoryId: 2, title: "A New Dawn for Priya", excerpt: "Access to education transformed one family's future across three generations.", content: "Access to education transformed one family's future across three generations.", coverImage: "", gallery: [], tags: [] },
    { id: 3, section: "story", categoryId: 3, title: "Building Futures Together", excerpt: "How a community cooperative changed the economic landscape of an entire village.", content: "How a community cooperative changed the economic landscape of an entire village.", coverImage: "", gallery: [], tags: [] },
    { id: 4, section: "story", categoryId: 4, title: "Health for All", excerpt: "Mobile health camps reached 2,000 women in remote areas with life-saving screenings.", content: "Mobile health camps reached 2,000 women in remote areas with life-saving screenings.", coverImage: "", gallery: [], tags: [] },
    { id: 5, section: "story", categoryId: 1, title: "First Woman Sarpanch", excerpt: "Asha Devi became the first female elected leader in her village after years of advocacy.", content: "Asha Devi became the first female elected leader in her village after years of advocacy.", coverImage: "", gallery: [], tags: [] },
    { id: 6, section: "story", categoryId: 2, title: "Breaking the Cycle", excerpt: "Four sisters all graduated high school — the first in their family's history.", content: "Four sisters all graduated high school — the first in their family's history.", coverImage: "", gallery: [], tags: [] },
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

  // One multi-row insert rather than one round trip per post.
  await dbPool.query(
    `INSERT INTO cms_blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
     VALUES ${rowPlaceholders(blogPosts.length, 9)}
     ON CONFLICT (id) DO NOTHING`,
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

  // 5. Default Councilors (IDs: 1, 2, 3)
  const councilors = [
    { id: 1, name: "Sunita Devi", role: "Community Advocate", bio: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", image: "", order_index: 0 },
    { id: 2, name: "Kavitha Reddy", role: "Education Lead", bio: "Through Mahila Action's programmes, Kavitha became the first woman elected to the panchayat.", image: "", order_index: 1 },
    { id: 3, name: "Meena Sharma", role: "Livelihood Champion", bio: "From daily wage laborer to micro-entrepreneur — a story of resilience and transformation.", image: "", order_index: 2 },
  ];
  await dbPool.query(
    `INSERT INTO cms_councilors (id, name, role, bio, image, order_index)
     VALUES ${rowPlaceholders(councilors.length, 6)}
     ON CONFLICT (id) DO NOTHING`,
    councilors.flatMap((c) => [c.id, c.name, c.role, c.bio, c.image, c.order_index])
  );

  // 6. Default Timeline (IDs: 1..6)
  const timeline = [
    { id: 1, year: "1995", title: "Foundation of Mahila Action", description: "Registered by a small group of six local women, starting with a single room operating basic literacy circles for children of brick-kiln laborers.", image: "", order_index: 0 },
    { id: 2, year: "2002", title: "Expanding Educational Access", description: "Launched three community learning centers reaching over 800 children and 400 adult learners across rural areas.", image: "", order_index: 1 },
    { id: 3, year: "2009", title: "Women's Leadership Programme", description: "Introduced the flagship leadership programme, training over 200 women to take civic and economic leadership roles.", image: "", order_index: 2 },
    { id: 4, year: "2016", title: "Livelihood & Skills Scale-Up", description: "Partnered with 12 corporate organizations to provide vocational training and employment to 3,000+ women.", image: "", order_index: 3 },
    { id: 5, year: "2021", title: "Digital & COVID Response", description: "Pivoted to digital learning; distributed 500 smartphones and provided mental health support to 10,000 families during the pandemic.", image: "", order_index: 4 },
    { id: 6, year: "2026", title: "28 Years of Lasting Change", description: "Operating across 200+ communities, our programmes have directly benefited over 10,000 women and their families.", image: "", order_index: 5 },
  ];
  await dbPool.query(
    `INSERT INTO cms_timeline (id, year, title, description, image, order_index)
     VALUES ${rowPlaceholders(timeline.length, 6)}
     ON CONFLICT (id) DO NOTHING`,
    timeline.flatMap((t) => [t.id, t.year, t.title, t.description, t.image, t.order_index])
  );

  // 7. Default Contact Info (ID: 1)
  await dbPool.query(
    `INSERT INTO cms_contact (id, email, email_note, phone, phone_note, address, address_note, hours, hours_note)
     VALUES (1, 'contact@mahilaction.org', 'We reply within 24 hours', '+91 XXXXXXXXXX', 'Mon – Sat, 9 AM – 6 PM IST', 'Hyderabad, Telangana', 'India – 500 001', 'Mon – Friday', '9:00 AM – 5:30 PM IST')
     ON CONFLICT (id) DO NOTHING`
  );

  // Synchronize PostgreSQL SERIAL sequences past manually seeded IDs
  if (!dbPool.isSqlite) {
    const tablesToSync = ["users", "cms_categories", "cms_events", "cms_blog_posts", "cms_councilors", "cms_timeline", "cms_contact"];
    // Sent as one batch — seven separate statements meant seven round trips.
    try {
      await dbPool.query(
        tablesToSync
          .map((t) => `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1));`)
          .join("\n")
      );
    } catch { }
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
        console.warn("schema.sql not found");
        return;
      }

      // Connection probe test for PostgreSQL
      if (!isUsingSqliteFallback && currentPool) {
        try {
          await currentPool.query("SELECT 1");
          console.log("✓ Connected to PostgreSQL database successfully.");
        } catch (pgErr: any) {
          const errMsg = pgErr?.message || "";
          const isDbNotExist = pgErr?.code === "3D000" || errMsg.includes("does not exist");

          if (isDbNotExist && process.env.DATABASE_URL) {
            try {
              const databaseUrl = process.env.DATABASE_URL;
              const parsedUrl = new URL(databaseUrl);
              const targetDbName = parsedUrl.pathname.replace(/^\//, "");
              if (targetDbName && targetDbName !== "postgres") {
                console.log(`Database "${targetDbName}" not found. Attempting auto-creation on PostgreSQL server...`);
                const pkg = await import("pg");
                const { Client, Pool } = pkg.default || pkg;

                parsedUrl.pathname = "/postgres";
                const adminClient = new Client({ connectionString: parsedUrl.toString() });
                await adminClient.connect();
                await adminClient.query(`CREATE DATABASE "${targetDbName.replace(/"/g, '""')}"`);
                await adminClient.end();
                console.log(`✓ Database "${targetDbName}" created successfully!`);

                const cleanUrl = databaseUrl.replace("sslmode=require", "sslmode=verify-full");
                const useSsl =
                  process.env.DATABASE_SSL === "true" ||
                  cleanUrl.includes("sslmode=") ||
                  cleanUrl.includes("neon.tech") ||
                  cleanUrl.includes("postgres.database.azure.com");

                if (currentPool && typeof currentPool.end === "function") {
                  await currentPool.end().catch(() => { });
                }

                currentPool = new Pool({
                  connectionString: cleanUrl,
                  ssl: useSsl ? { rejectUnauthorized: false } : false,
                  max: 20,
                  idleTimeoutMillis: 30000,
                  connectionTimeoutMillis: 5000,
                  keepAlive: true,
                });
                pool = currentPool;
                globalRef._pgPool = pool;

                await currentPool.query("SELECT 1");
                console.log("✓ Connected to PostgreSQL database successfully.");
              } else {
                throw pgErr;
              }
            } catch (createErr: any) {
              console.warn("⚠️ Could not auto-create database:", createErr?.message || createErr);
              isUsingSqliteFallback = true;
              globalRef._isUsingSqliteFallback = true;
              pool = createSqlitePool();
              globalRef._pgPool = pool;
              currentPool = pool;
            }
          } else {
            console.warn("\n==================================================================");
            console.warn("⚠️ PostgreSQL Connection Error:");
            console.warn(`   ${errMsg}`);
            console.warn("🔄 Switching to local database fallback for fast, 200 OK operations.");
            console.warn("==================================================================\n");

            isUsingSqliteFallback = true;
            globalRef._isUsingSqliteFallback = true;
            pool = createSqlitePool();
            globalRef._pgPool = pool;
            currentPool = pool;
          }
        }
      }

      const cleanRawSchema = rawSchema
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

      // Applying the schema and seed costs one network round trip per statement
      // — around fifty of them. Once a given schema.sql has been applied there is
      // nothing left to do, so check a marker row first and skip the whole thing.
      // Changing schema.sql changes its hash, which makes the next start reapply.
      const schemaVersion = schemaFingerprint(rawSchema);
      const appliedVersion = await readAppliedSchemaVersion(currentPool);

      if (appliedVersion === schemaVersion) {
        await removeSuperadminRows(currentPool).catch(() => { });
        isInitialized = true;
        globalRef._dbInitialized = true;
        console.log(
          isUsingSqliteFallback
            ? "✓ Local database already up to date."
            : "✓ PostgreSQL database already up to date."
        );
        return;
      }

      if (isUsingSqliteFallback) {
        // Execute SQLite schema
        const sqliteSchema = cleanRawSchema
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
          } catch { }
        }

        try {
          await currentPool.query("ALTER TABLE users ADD COLUMN kind TEXT;");
        } catch { }
        try {
          await currentPool.query("ALTER TABLE users ADD COLUMN permissions TEXT;");
        } catch { }
      } else {
        // PostgreSQL schema. Every statement is idempotent (IF NOT EXISTS), so
        // they go out as a single batch instead of one round trip each.
        const statements = [
          ...cleanRawSchema.split(";").map((s) => s.trim()).filter(Boolean),
          "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS kind TEXT",
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT",
          "ALTER TABLE cms_events ADD COLUMN IF NOT EXISTS category_id TEXT",
          "ALTER TABLE cms_events ADD COLUMN IF NOT EXISTS max_volunteers INTEGER DEFAULT 0",
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
      }

      // Seed all default data into database
      await seedAllData(currentPool);
      await recordSchemaVersion(currentPool, schemaVersion).catch((err) =>
        console.warn("Could not record schema version marker:", err?.message || err)
      );

      isInitialized = true;
      globalRef._dbInitialized = true;
      console.log(
        isUsingSqliteFallback
          ? "✓ Local database initialized & seeded successfully."
          : "✓ PostgreSQL database initialized & seeded successfully."
      );
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

export async function queryDb(text: string, params: any[] = []) {
  // Bypass live queries during Next.js static build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { rows: [], rowCount: 0 };
  }

  const isSelect = /^\s*SELECT/i.test(text);
  const cacheKey = isSelect ? `${text}::${JSON.stringify(params)}` : "";

  // Return cached result if SELECT query is within TTL
  if (isSelect) {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  } else {
    // Invalidate SELECT cache whenever a write query runs
    clearQueryCache();
  }

  if (!isInitialized) {
    await initDb();
  }
  const currentPool = await getPool();
  const res = await currentPool.query(text, params);

  // Store in cache for 15 seconds if SELECT query
  if (isSelect && res) {
    queryCache.set(cacheKey, { data: res, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return res;
}

export default pool;
