-- ============================================================
-- Migration: add skills + screening questions support
-- Run against existing deployments. Safe to re-run (IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ── 1. Add skills column to jobs ──────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── 2. job_questions ──────────────────────────────────────────────────────────
-- Stores the screening questions pushed from Odoo per job.
-- Replaced on every job push (old rows deleted, new rows inserted).
CREATE TABLE IF NOT EXISTS job_questions (
  id          TEXT        PRIMARY KEY,            -- OD-Q-{n} from Odoo
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sequence    INTEGER     NOT NULL DEFAULT 0,     -- display order
  text        TEXT        NOT NULL,
  type        TEXT        NOT NULL,               -- text | radio | checkbox | dropdown
  required    BOOLEAN     NOT NULL DEFAULT false,
  char_limit  INTEGER                             -- for text type only; null = unlimited
);

-- ── 3. job_question_options ────────────────────────────────────────────────────
-- Choices for radio / checkbox / dropdown questions.
CREATE TABLE IF NOT EXISTS job_question_options (
  id           TEXT        PRIMARY KEY,           -- OD-OPT-{n} from Odoo
  question_id  TEXT        NOT NULL REFERENCES job_questions(id) ON DELETE CASCADE,
  sequence     INTEGER     NOT NULL DEFAULT 0,
  label        TEXT        NOT NULL
);

-- ── 4. application_question_answers ───────────────────────────────────────────
-- Stores the applicant's answers. question_id is stored as plain text (no FK)
-- so historical answers are preserved even when Odoo replaces questions on a
-- subsequent job push.
CREATE TABLE IF NOT EXISTS application_question_answers (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    UUID    NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id       TEXT    NOT NULL,             -- OD-Q-{n}; no FK — preserved after question replacement
  answer_text       TEXT,                         -- for type = text
  answer_option_ids TEXT[]                        -- for type = radio/checkbox/dropdown (OD-OPT-{n} ids)
);

-- ── 5. Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_questions_job   ON job_questions(job_id);
CREATE INDEX IF NOT EXISTS idx_jqopts_question     ON job_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_aqa_application     ON application_question_answers(application_id);
