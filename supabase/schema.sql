-- ============================================================
-- Iride — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (idempotent)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username         TEXT UNIQUE NOT NULL,
  display_name     TEXT NOT NULL,
  avatar_url       TEXT,
  city             TEXT,
  location_consent BOOLEAN DEFAULT FALSE NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add columns if upgrading from an older installation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_consent BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------------------
-- Mood entries
-- Immutable after INSERT: no UPDATE or DELETE policies.
-- Uniqueness enforced at DB level via UNIQUE(user_id, date).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mood_entries (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date           DATE NOT NULL,
  color_hex      TEXT NOT NULL,
  mood_label     TEXT,
  note           TEXT,
  tags           TEXT[],
  source         TEXT CHECK (source IN ('palette', 'custom')) DEFAULT 'palette' NOT NULL,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  location_label TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  locked         BOOLEAN DEFAULT TRUE NOT NULL,
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- Add columns if upgrading from an older installation
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS note           TEXT;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS tags           TEXT[];
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS latitude       DOUBLE PRECISION;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS longitude      DOUBLE PRECISION;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS location_label TEXT;

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entries"   ON mood_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON mood_entries;

CREATE POLICY "Users can view own entries"
  ON mood_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON mood_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies → entries are permanently locked after creation

-- ------------------------------------------------------------
-- Exports (data model ready, populated client-side for now)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exports (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period_type   TEXT CHECK (period_type IN ('weekly', 'monthly', 'yearly')) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own exports" ON exports;

CREATE POLICY "Users can manage own exports"
  ON exports USING (auth.uid() = user_id);
