-- PostgreSQL Schema for Mahila Action Site
-- Version: 5.1 (Persistent INTEGER SERIAL Schema — Safe to re-run without wiping data)

-- 1. Users table (Admins, Members, Volunteers, Vendors)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  kind TEXT,
  password_hash TEXT NOT NULL,
  skills TEXT,
  permissions TEXT,
  reset_token_hash TEXT,
  reset_token_expires TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CMS Categories
CREATE TABLE IF NOT EXISTS cms_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CMS Events
CREATE TABLE IF NOT EXISTS cms_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  event_date TEXT NOT NULL,
  location TEXT,
  total_seats INTEGER DEFAULT 0,
  windows TEXT NOT NULL,
  category_id INTEGER REFERENCES cms_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CMS Blog posts & Impact Stories
CREATE TABLE IF NOT EXISTS cms_blog_posts (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  category_id INTEGER REFERENCES cms_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image TEXT,
  gallery TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CMS Councilors
CREATE TABLE IF NOT EXISTS cms_councilors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

-- 6. CMS Timeline
CREATE TABLE IF NOT EXISTS cms_timeline (
  id SERIAL PRIMARY KEY,
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

-- 7. CMS Contact settings
CREATE TABLE IF NOT EXISTS cms_contact (
  id SERIAL PRIMARY KEY,
  email TEXT,
  email_note TEXT,
  phone TEXT,
  phone_note TEXT,
  address TEXT,
  address_note TEXT,
  hours TEXT,
  hours_note TEXT
);

-- 8. Donations table
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  amount DOUBLE PRECISION NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  donation_type TEXT,
  anonymous INTEGER DEFAULT 0,
  event_name TEXT,
  campaign_name TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Event reservations table (seat bookings, volunteers, vendors)
CREATE TABLE IF NOT EXISTS event_reservations (
  id SERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  volunteer_commitment TEXT,
  companions TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Permanent volunteer activation/deactivation requests
CREATE TABLE IF NOT EXISTS perm_volunteer_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  request_type TEXT NOT NULL DEFAULT 'activate',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Site content key-value store
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Internal bookkeeping for the app itself (schema version marker, etc).
-- Deliberately separate from site_content, which is user-editable CMS copy and
-- is returned wholesale by GET /api/content.
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Recycle Bin (soft-deleted items held for restore or permanent erase)
-- item_id is TEXT because sources use both integer (CMS tables) and string (submissions) ids.
-- data holds a full JSON snapshot of the original row so it can be restored later.
CREATE TABLE IF NOT EXISTS recycle_bin (
  id SERIAL PRIMARY KEY,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  data TEXT NOT NULL,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One trash entry per source row: re-deleting the same item overwrites its entry.
CREATE UNIQUE INDEX IF NOT EXISTS recycle_bin_item_unique ON recycle_bin (item_type, item_id);
CREATE INDEX IF NOT EXISTS recycle_bin_deleted_at_idx ON recycle_bin (deleted_at);
