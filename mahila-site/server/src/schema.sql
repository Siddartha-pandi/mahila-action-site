-- SQLite schema for the Mahila Action backend.
-- JSON-ish columns (companions, windows, gallery, tags, selected_events) are
-- stored as TEXT and JSON.stringify/parse'd in the route handlers, since
-- SQLite has no native json/jsonb type.

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  donation_type TEXT CHECK (donation_type IN ('one-time', 'monthly')) DEFAULT 'one-time',
  anonymous INTEGER DEFAULT 0,
  event_name TEXT,
  campaign_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_reservations (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  volunteer_commitment TEXT CHECK (volunteer_commitment IN ('event_only', 'ongoing')),
  companions TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendor_registrations (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  offering TEXT NOT NULL,
  needs_space INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS volunteer_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  skills TEXT,
  reset_token_hash TEXT,
  reset_token_expires TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  skills TEXT,
  selected_events TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  event_date TEXT NOT NULL,
  location TEXT,
  total_seats INTEGER DEFAULT 0,
  windows TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_blog_posts (
  id TEXT PRIMARY KEY,
  section TEXT CHECK (section IN ('story', 'event', 'impact')) NOT NULL,
  category_id TEXT REFERENCES cms_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image TEXT,
  gallery TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_councilors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_timeline (
  id TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_contact (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT, email_note TEXT,
  phone TEXT, phone_note TEXT,
  address TEXT, address_note TEXT,
  hours TEXT, hours_note TEXT
);
