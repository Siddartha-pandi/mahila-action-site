export const FALLBACK_SCHEMA_SQL = `
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
  pan_number TEXT,
  address TEXT,
  payment_method TEXT DEFAULT 'upi',
  transaction_id TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  category_id INTEGER,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  category_id INTEGER,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image TEXT,
  gallery TEXT,
  tags TEXT,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  pan_number TEXT,
  address TEXT,
  payment_method TEXT DEFAULT 'upi',
  transaction_id TEXT,
  receipt_number TEXT,
  notes TEXT,
  is_offline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_reservations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS recycle_bin_item_unique ON recycle_bin (item_type, item_id);
CREATE INDEX IF NOT EXISTS recycle_bin_deleted_at_idx ON recycle_bin (deleted_at);

CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  uuid TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL DEFAULT 0,
  object_key TEXT,
  bucket_name TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  url TEXT,
  url_hash TEXT,
  thumbnail_url TEXT,
  media_type TEXT DEFAULT 'image',
  metadata JSONB DEFAULT '{}'::jsonb,
  data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

