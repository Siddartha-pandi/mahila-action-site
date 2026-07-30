-- PostgreSQL Schema for Mahila Action Site
-- Version: 4.0
-- Author: Antigravity

DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS vendor_registrations CASCADE;
DROP TABLE IF EXISTS event_reservations CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS site_content CASCADE;
DROP TABLE IF EXISTS cms_timeline CASCADE;
DROP TABLE IF EXISTS cms_councilors CASCADE;
DROP TABLE IF EXISTS cms_blog_posts CASCADE;
DROP TABLE IF EXISTS cms_categories CASCADE;
DROP TABLE IF EXISTS cms_events CASCADE;
DROP TABLE IF EXISTS cms_contact CASCADE;
DROP TABLE IF EXISTS volunteer_registrations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table unifying admins and volunteers
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('superadmin', 'admin', 'member', 'volunteer', 'vendor', 'attendee')),
  password_hash TEXT NOT NULL,
  skills TEXT,
  reset_token_hash TEXT,
  reset_token_expires TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Volunteer registrations (public signup submissions)
CREATE TABLE volunteer_registrations (
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
CREATE TABLE donations (
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
CREATE TABLE event_reservations (
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
CREATE TABLE vendor_registrations (
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
CREATE TABLE contact_submissions (
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
CREATE TABLE site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS Events
CREATE TABLE cms_events (
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
CREATE TABLE cms_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS Blog posts
CREATE TABLE cms_blog_posts (
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
CREATE TABLE cms_councilors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

-- CMS Timeline
CREATE TABLE cms_timeline (
  id TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  order_index INTEGER DEFAULT 0
);

-- CMS Contact settings
CREATE TABLE cms_contact (
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
