-- ============================================================
-- EPRC Jobs Portal — PostgreSQL Init Script
-- Runs automatically on first container start via
-- /docker-entrypoint-initdb.d/01_init.sql
--
-- Adapted from talent-gateway/supabase/migration_full.sql.
-- Supabase-specific items removed:
--   • storage.buckets INSERT  (handled by MinIO at API startup)
--   • storage.objects policies
--   • ENABLE ROW LEVEL SECURITY  (database is not publicly exposed;
--     access control is enforced by the API service)
--   • CREATE POLICY statements
-- All tables, indexes, and triggers are identical to the POC.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  odoo_job_id    TEXT UNIQUE NOT NULL,   -- "OD-{hr.job.id}" pushed from Odoo
  title          TEXT NOT NULL,
  department     TEXT,
  location       TEXT,
  closing_date   DATE,
  description    TEXT,                   -- raw HTML from Odoo
  skills         JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ name, type }] pushed from Odoo
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
  cv_file_path         TEXT,            -- MinIO object path: {uuid}/cv/{ts}.ext
  status               TEXT        NOT NULL DEFAULT 'new',
  job_id               UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  odoo_applicant_id    INTEGER,         -- written back by Odoo via PATCH endpoint
  gateway_sync_status  TEXT        NOT NULL DEFAULT 'new',
                                        -- lifecycle: new → imported | failed
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experience (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position        TEXT        NOT NULL,
  description     TEXT,
  employer        TEXT        NOT NULL,
  start_date      TEXT        NOT NULL,  -- stored as YYYY-MM, padded to YYYY-MM-01 for Odoo
  end_date        TEXT,
  is_current      BOOLEAN     NOT NULL DEFAULT false,
  years           NUMERIC(4,1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS education (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id      UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  qualification       TEXT        NOT NULL,
  level               TEXT        NOT NULL,  -- Odoo selection key: bachelor, master, phd …
  field_of_study      TEXT        NOT NULL,
  institution         TEXT        NOT NULL,
  year_completed      INTEGER,
  accolade_file_path  TEXT,              -- MinIO object path: {uuid}/accolades/{ts}_{rand}.ext
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

-- ── Screening questions (pushed from Odoo as part of job payload) ─────────────

CREATE TABLE IF NOT EXISTS job_questions (
  id          TEXT        PRIMARY KEY,            -- OD-Q-{n} from Odoo
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sequence    INTEGER     NOT NULL DEFAULT 0,
  text        TEXT        NOT NULL,
  type        TEXT        NOT NULL,               -- text | radio | checkbox | dropdown
  required    BOOLEAN     NOT NULL DEFAULT false,
  char_limit  INTEGER                             -- for text type only; null = unlimited
);

CREATE TABLE IF NOT EXISTS job_question_options (
  id           TEXT        PRIMARY KEY,           -- OD-OPT-{n} from Odoo
  question_id  TEXT        NOT NULL REFERENCES job_questions(id) ON DELETE CASCADE,
  sequence     INTEGER     NOT NULL DEFAULT 0,
  label        TEXT        NOT NULL
);

-- question_id has NO FK — preserves historical answers when questions are replaced
CREATE TABLE IF NOT EXISTS application_question_answers (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    UUID    NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id       TEXT    NOT NULL,
  answer_text       TEXT,                         -- for type = text
  answer_option_ids TEXT[]                        -- for type = radio / checkbox / dropdown
);

CREATE INDEX IF NOT EXISTS idx_job_questions_job   ON job_questions(job_id);
CREATE INDEX IF NOT EXISTS idx_jqopts_question     ON job_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_aqa_application     ON application_question_answers(application_id);

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
