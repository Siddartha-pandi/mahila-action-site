-- PostgreSQL Schema for Mahila Action Site
-- Version: 4.1
-- Author: Antigravity
-- NOTE: Uses CREATE TABLE IF NOT EXISTS — safe to re-run without wiping data.

-- Users table unifying admins and volunteers
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'user', 'volunteer', 'vendor', 'attendee')),
  kind TEXT,
  password_hash TEXT NOT NULL,
  skills TEXT,
  reset_token_hash TEXT,
  reset_token_expires TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Volunteer registrations (public signup submissions)
CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  skills TEXT,
  selected_events TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
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

-- Event reservations table
CREATE TABLE IF NOT EXISTS event_reservations (
  id TEXT PRIMARY KEY,
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

-- Vendor registrations table
CREATE TABLE IF NOT EXISTS vendor_registrations (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  offering TEXT NOT NULL,
  needs_space INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site content key-value store
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS Events
CREATE TABLE IF NOT EXISTS cms_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  event_date TEXT NOT NULL,
  location TEXT,
  total_seats INTEGER DEFAULT 0,
  windows TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS Categories
CREATE TABLE IF NOT EXISTS cms_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS Blog posts
CREATE TABLE IF NOT EXISTS cms_blog_posts (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  category_id TEXT REFERENCES cms_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image TEXT,
  gallery TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS Councilors
CREATE TABLE IF NOT EXISTS cms_councilors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

-- CMS Timeline
CREATE TABLE IF NOT EXISTS cms_timeline (
  id TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

-- CMS Contact settings
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

-- Permanent volunteer activation/deactivation requests
CREATE TABLE IF NOT EXISTS perm_volunteer_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  request_type TEXT NOT NULL DEFAULT 'activate',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
