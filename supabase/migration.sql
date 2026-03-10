-- ============================================================
-- Supabase Migration: Job Application Tables & Storage Bucket
-- Run this in the Supabase SQL Editor (or via CLI migration).
-- ============================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Applications table
CREATE TABLE IF NOT EXISTS applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  summary       TEXT,
  cv_file_path  TEXT,
  status        TEXT        NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Experience table
CREATE TABLE IF NOT EXISTS experience (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position        TEXT        NOT NULL,
  description     TEXT,
  employer        TEXT        NOT NULL,
  start_date      TEXT        NOT NULL,
  end_date        TEXT        NOT NULL,
  years           NUMERIC(4,1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Education table
CREATE TABLE IF NOT EXISTS education (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id      UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  qualification       TEXT        NOT NULL,
  level               TEXT        NOT NULL,
  field_of_study      TEXT        NOT NULL,
  institution         TEXT        NOT NULL,
  year_completed      INTEGER,
  accolade_file_path  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_experience_application ON experience(application_id);
CREATE INDEX IF NOT EXISTS idx_education_application  ON education(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_email     ON applications(email);

-- 5. Updated_at trigger for applications
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. Storage bucket for application files (CVs and accolades)
-- Run this via the Supabase Dashboard > Storage, or use the SQL below:
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-files', 'application-files', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies – allow anonymous uploads & reads
--    (adjust to match your auth strategy)
CREATE POLICY "Allow anonymous uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'application-files');

CREATE POLICY "Allow anonymous reads" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'application-files');

-- 8. Row-Level Security (RLS) – enable and allow inserts for anon/public
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience   ENABLE ROW LEVEL SECURITY;
ALTER TABLE education    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on experience" ON experience
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on education" ON education
  FOR INSERT WITH CHECK (true);

-- Allow the application to update its own row (for cv_file_path & status)
CREATE POLICY "Allow anonymous update on applications" ON applications
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow reading for select().single() after insert
CREATE POLICY "Allow anonymous select on applications" ON applications
  FOR SELECT USING (true);
