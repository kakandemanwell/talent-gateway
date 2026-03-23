-- ============================================================
-- TEARDOWN: Drop everything created by migration.sql
--           and migration_jobs.sql
-- Safe to run whether or not tables/policies already exist.
-- ============================================================

-- 1. Drop tables with CASCADE — automatically removes all attached
--    policies, triggers, indexes, and foreign key constraints.
--    Child tables (experience, education) must come before applications.
DROP TABLE IF EXISTS experience   CASCADE;
DROP TABLE IF EXISTS education    CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs         CASCADE;

-- 2. Drop trigger function (CASCADE already removed triggers above)
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- 3. Drop storage policies (these live on storage.objects, not our tables)
--    These persist across table teardowns so must always be explicitly dropped.
DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous reads"   ON storage.objects;

-- 4. Remove storage bucket: must be done via the Dashboard UI, not SQL.
--    Go to: Supabase Dashboard → Storage → application-files → Delete bucket
--    (Empty it first if it contains files.)
