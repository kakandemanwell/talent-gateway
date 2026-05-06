-- ============================================================
-- Migration: Multi-tenant SaaS Recruitment Platform
-- Adds organizations, users, RBAC, and pipeline management
-- ============================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations Table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'starter', -- starter, professional, enterprise
  status          TEXT NOT NULL DEFAULT 'active', -- active, suspended, trial_ended
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users Table (Unified Auth) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  user_type       TEXT NOT NULL, -- applicant, recruiter
  first_name      TEXT,
  last_name       TEXT,
  profile_picture_url TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Organization Members (Team Structure) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL, -- org_admin, hiring_manager, recruiter
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ── Applicant Profiles (Structured Data) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS applicant_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  summary         TEXT,
  skills          TEXT[], -- Array of skill strings
  portfolio_links TEXT[], -- Array of URLs
  preferred_job_type TEXT,
  preferred_locations TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Enhanced Job Postings ──────────────────────────────────────────────────────
-- Add org_id to existing jobs table (backward compatible)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'; -- open, closed, draft

-- Update closing_date to be nullable for open-ended positions
ALTER TABLE jobs ALTER COLUMN closing_date DROP NOT NULL;

-- ── Pipeline Stages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  stage_name      TEXT NOT NULL, -- screening, interview, offer, hired, rejected
  position_order  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, stage_name)
);

-- ── Candidates in Pipeline ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates_in_pipeline (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id  UUID REFERENCES applications(id) ON DELETE SET NULL,
  current_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  match_score     NUMERIC(5,2),
  ranking         INTEGER,
  notes           TEXT,
  moved_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(applicant_id, job_id)
);

-- ── Communications (Email Templates & History) ────────────────────────────────
CREATE TABLE IF NOT EXISTS communications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template_type   TEXT NOT NULL, -- welcome, status_update, rejection, offer
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  candidate_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_user_id ON applicant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_job_id ON pipeline_stages(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates_in_pipeline(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_applicant_id ON candidates_in_pipeline(applicant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage_id ON candidates_in_pipeline(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_communications_org_id ON communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_communications_job_id ON communications(job_id);

-- ── Update Triggers ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_applicant_profiles_updated_at ON applicant_profiles;
CREATE TRIGGER trg_applicant_profiles_updated_at
  BEFORE UPDATE ON applicant_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_candidates_in_pipeline_updated_at ON candidates_in_pipeline;
CREATE TRIGGER trg_candidates_in_pipeline_updated_at
  BEFORE UPDATE ON candidates_in_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row-Level Security (RLS) ────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates_in_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read their own org
CREATE POLICY "Org members can read their org" ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = current_user_id()
    )
  );

-- Users: read public profile info, update own profile
CREATE POLICY "Users can read public profiles" ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- Org Members: can read members of their org
CREATE POLICY "Org members can read team" ON organization_members
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = current_user_id()
    )
  );

-- Applicant Profiles: can read/update own
CREATE POLICY "Applicants can read own profile" ON applicant_profiles
  FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "Applicants can update own profile" ON applicant_profiles
  FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Pipeline: recruiters of org can access
CREATE POLICY "Recruiters can read pipeline" ON candidates_in_pipeline
  FOR SELECT
  USING (
    job_id IN (
      SELECT jobs.id FROM jobs
      INNER JOIN organization_members ON jobs.org_id = organization_members.org_id
      WHERE organization_members.user_id = current_user_id()
    )
  );

CREATE POLICY "Recruiters can update pipeline" ON candidates_in_pipeline
  FOR UPDATE
  USING (
    job_id IN (
      SELECT jobs.id FROM jobs
      INNER JOIN organization_members ON jobs.org_id = organization_members.org_id
      WHERE organization_members.user_id = current_user_id()
    )
  );

-- Communications: org members can read/insert
CREATE POLICY "Org members can read communications" ON communications
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "Org members can insert communications" ON communications
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = current_user_id()
    )
  );

-- Existing jobs table: public can read open jobs
CREATE POLICY "Public can read open jobs" ON jobs
  FOR SELECT
  USING (status = 'open' AND is_active = true AND (closing_date IS NULL OR closing_date >= CURRENT_DATE));

-- Org members can manage jobs in their org
CREATE POLICY "Org members can manage org jobs" ON jobs
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = current_user_id()
    )
  );
