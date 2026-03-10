-- ============================================================
-- Migration: Jobs table + Application sync columns
-- Run AFTER migration.sql (which creates the update_updated_at
-- trigger function and the applications/experience/education tables).
-- ============================================================

-- 1. Jobs table (receives pushes from Odoo)
CREATE TABLE IF NOT EXISTS jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  odoo_job_id    TEXT UNIQUE NOT NULL,          -- "OD-{hr.job.id}"
  title          TEXT NOT NULL,
  department     TEXT,
  location       TEXT,
  closing_date   DATE,
  description    TEXT,                           -- raw HTML from Odoo
  is_active      BOOLEAN NOT NULL DEFAULT true,  -- false = archived/expired in Odoo
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_odoo_id   ON jobs(odoo_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_closing   ON jobs(closing_date);

-- Reuse the trigger function already defined in migration.sql
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Add Odoo-sync columns to applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS odoo_applicant_id   INTEGER,
  ADD COLUMN IF NOT EXISTS gateway_sync_status TEXT NOT NULL DEFAULT 'new';
  -- gateway_sync_status values: 'new' | 'imported' | 'failed'

-- 3. Add is_current to experience (Gap 3: required by Odoo hr.applicant.experience model)
ALTER TABLE experience
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_applications_job    ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_gsync  ON applications(gateway_sync_status);

-- 3. Row-Level Security for jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read active, non-expired jobs — powers the portal listing
CREATE POLICY "Public read active jobs" ON jobs
  FOR SELECT
  USING (
    is_active = true
    AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
  );

-- Service role (Edge Functions) bypass RLS automatically.
-- No INSERT/UPDATE policy needed for anon — only Odoo (via service role) writes jobs.

-- 4. Tighten applications SELECT access
-- The broad anon SELECT policy from migration.sql is replaced:
-- anon can no longer read the applications table.
-- Service role (Edge Functions) bypass RLS and handle all reads for Odoo.
DROP POLICY IF EXISTS "Allow anonymous select on applications" ON applications;

-- 5. Allow service role to update gateway_sync_status + odoo_applicant_id
-- (Service role bypasses RLS by default in Supabase — no explicit policy needed.)
