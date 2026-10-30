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
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CMS Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  event_date TEXT NOT NULL,
  location TEXT,
  total_seats INTEGER DEFAULT 0,
  max_volunteers INTEGER DEFAULT 0,
  windows TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CMS Blog posts & Impact Stories
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image TEXT,
  gallery TEXT,
  tags TEXT,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Donations table
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

-- 6. Event reservations table (seat bookings, volunteers, vendors)
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

-- 7. Contact submissions table
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

-- 8. Permanent volunteer activation/deactivation requests
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

-- 9. Recycle Bin (soft-deleted items held for restore or permanent erase)
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

-- 10. Performance Indexes for Low-Latency Lookups
CREATE INDEX IF NOT EXISTS users_role_status_idx ON users (role, status);
CREATE INDEX IF NOT EXISTS blog_posts_section_cat_idx ON blog_posts (section, category_id, created_at);
CREATE INDEX IF NOT EXISTS events_date_cat_idx ON events (event_date, category_id);
CREATE INDEX IF NOT EXISTS donations_status_created_idx ON donations (status, created_at);
CREATE INDEX IF NOT EXISTS event_reservations_status_created_idx ON event_reservations (status, created_at);

-- 11. Media & Images Table (binary BYTEA storage)
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_created_at_idx ON media (created_at DESC);

