-- ============================================================
-- SAFEHUB Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Shelters ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shelters (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  lat float8,
  lng float8,
  capacity int DEFAULT 100,
  current_occupancy int DEFAULT 0,
  status text DEFAULT 'available',
  verification_status text DEFAULT 'verified',
  medical_available boolean DEFAULT false,
  contact_phone text,
  facilities text[],
  description text,
  created_at bigint DEFAULT extract(epoch from now()) * 1000,
  updated_at bigint DEFAULT extract(epoch from now()) * 1000
);

-- ─── User Profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  uid text PRIMARY KEY,
  name text,
  email text,
  phone text,
  role text DEFAULT 'citizen',
  approval_status text DEFAULT 'approved',
  blood_type text,
  medical_conditions text,
  mobility_needs text,
  assigned_shelter_id text,
  created_at bigint DEFAULT extract(epoch from now()) * 1000,
  updated_at bigint DEFAULT extract(epoch from now()) * 1000
);

-- ─── Admin Audit Logs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id text PRIMARY KEY,
  admin_uid text,
  admin_email text,
  action text,
  target_resource text,
  target_id text,
  details text,
  timestamp bigint DEFAULT extract(epoch from now()) * 1000
);

-- ─── Discovered Facilities (SerpAPI candidates) ─────────────
CREATE TABLE IF NOT EXISTS discovered_facilities (
  id text PRIMARY KEY,
  name text,
  place_type text,
  address text,
  lat float8,
  lng float8,
  phone text,
  rating float8,
  user_ratings_total int,
  is_verified_as_shelter boolean DEFAULT false,
  imported_shelter_id text,
  source text
);

-- ─── Row Level Security (open for now — tighten later) ──────
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all shelters" ON shelters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all user_profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all admin_audit_logs" ON admin_audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE discovered_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all discovered_facilities" ON discovered_facilities FOR ALL USING (true) WITH CHECK (true);
