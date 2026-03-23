-- ============================================================
-- Full Migration: All tables, triggers, storage, RLS policies
-- Single file combining migration.sql + migration_jobs.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  odoo_job_id    TEXT UNIQUE NOT NULL,
  title          TEXT NOT NULL,
  department     TEXT,
  location       TEXT,
  closing_date   DATE,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name            TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  phone                TEXT        NOT NULL,
  summary              TEXT,
  cv_file_path         TEXT,
  status               TEXT        NOT NULL DEFAULT 'new',
  job_id               UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  odoo_applicant_id    INTEGER,
  gateway_sync_status  TEXT        NOT NULL DEFAULT 'new',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experience (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position        TEXT        NOT NULL,
  description     TEXT,
  employer        TEXT        NOT NULL,
  start_date      TEXT        NOT NULL,
  end_date        TEXT,
  is_current      BOOLEAN     NOT NULL DEFAULT false,
  years           NUMERIC(4,1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_jobs_odoo_id           ON jobs(odoo_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active         ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_closing           ON jobs(closing_date);
CREATE INDEX IF NOT EXISTS idx_experience_application ON experience(application_id);
CREATE INDEX IF NOT EXISTS idx_education_application  ON education(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_email     ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_job       ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_gsync     ON applications(gateway_sync_status);

-- ── updated_at trigger ────────────────────────────────────────────────────────

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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-files', 'application-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous reads"   ON storage.objects;

CREATE POLICY "Allow anonymous uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'application-files');

CREATE POLICY "Allow anonymous reads" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'application-files');

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience   ENABLE ROW LEVEL SECURITY;
ALTER TABLE education    ENABLE ROW LEVEL SECURITY;

-- Jobs: anyone can read active, non-expired listings
CREATE POLICY "Public read active jobs" ON jobs
  FOR SELECT
  USING (
    is_active = true
    AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
  );

-- Applications: anon can insert and update their own submission
CREATE POLICY "Allow anonymous insert on applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update on applications" ON applications
  FOR UPDATE USING (true) WITH CHECK (true);

-- Experience / Education: anon can insert rows linked to an application
CREATE POLICY "Allow anonymous insert on experience" ON experience
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on education" ON education
  FOR INSERT WITH CHECK (true);
