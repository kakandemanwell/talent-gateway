/**
 * scripts/migrate.ts
 *
 * Idempotent database migration for the EPRC Jobs Portal on Neon.
 *
 * Run via:   npm run db:migrate
 * Vercel:    set buildCommand = "npm run db:migrate && vite build" in vercel.json
 *
 * Design principles
 * ─────────────────
 * • Every DDL statement is idempotent (IF NOT EXISTS / IF EXISTS / OR REPLACE).
 * • Re-running on an existing database is completely safe — nothing is dropped
 *   except triggers that are immediately recreated.
 * • Supabase-specific blocks (storage.buckets, RLS policies) are skipped on
 *   Neon with an informational message, not an error.
 * • Each logical step is wrapped in its own try/catch so a failure in one
 *   section is reported clearly without masking others.
 * • The script exits with code 1 on any unrecoverable error so Vercel aborts
 *   the build rather than deploying against a broken schema.
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[migrate] ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 15,
  // Let errors propagate — we handle them per-step below.
  transform: { undefined: null },
});

// ── Helper: run a block and report; never swallow unknown errors ──────────────
async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Certain "errors" are expected on redeploy and are safe to ignore:
    //   42P07 = duplicate_table (shouldn't happen with IF NOT EXISTS, but guard)
    //   42701 = duplicate_column (ALTER TABLE ADD COLUMN IF NOT EXISTS on old PG)
    //   42710 = duplicate_object (e.g. duplicate index on some PG versions)
    //   42P16 = invalid_table_definition (RLS already enabled)
    const code = (err as { code?: string }).code ?? "";
    const safeErrors = ["42P07", "42701", "42710", "42P16"];
    if (safeErrors.includes(code)) {
      console.log(`  ↩  ${name} — already exists, skipped (${code})`);
      return;
    }
    // Supabase-only objects (storage schema, RLS on tables we don't own)
    // appear as "relation does not exist" or "schema does not exist" on Neon.
    if (code === "42P01" || code === "3F000") {
      console.log(`  ↩  ${name} — not applicable on this platform, skipped`);
      return;
    }
    // Duplicate policy (already-created RLS policy); safe to skip.
    if (code === "42710" || msg.includes("already exists")) {
      console.log(`  ↩  ${name} — already exists, skipped`);
      return;
    }
    console.error(`  ✗  ${name} FAILED: ${msg}`);
    throw err; // re-throw — caller will exit(1)
  }
}

async function main(): Promise<void> {
  console.log("[migrate] Starting database migration…");
  console.log(`[migrate] Target: ${DATABASE_URL!.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  console.log("");

  // Track whether any step threw so we can exit with code 1 at the end.
  let failed = false;

  // ── 0. Extensions ──────────────────────────────────────────────────────────
  console.log("── Extensions");
  await step("uuid-ossp", async () => {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  }).catch(() => { failed = true; });

  // ── 1. Core tables ─────────────────────────────────────────────────────────
  console.log("\n── Core tables");

  await step("jobs", async () => {
    await sql`
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
      )
    `;
  }).catch(() => { failed = true; });

  await step("jobs.skills column", async () => {
    await sql`
      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb
    `;
  }).catch(() => { failed = true; });

  await step("applications", async () => {
    await sql`
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
      )
    `;
  }).catch(() => { failed = true; });

  await step("experience", async () => {
    await sql`
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
      )
    `;
  }).catch(() => { failed = true; });

  await step("education", async () => {
    await sql`
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
      )
    `;
  }).catch(() => { failed = true; });

  // ── 2. Screening questions tables ──────────────────────────────────────────
  console.log("\n── Screening questions");

  await step("job_questions", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS job_questions (
        id          TEXT    PRIMARY KEY,
        job_id      UUID    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        sequence    INTEGER NOT NULL DEFAULT 0,
        text        TEXT    NOT NULL,
        type        TEXT    NOT NULL,
        required    BOOLEAN NOT NULL DEFAULT false,
        char_limit  INTEGER
      )
    `;
  }).catch(() => { failed = true; });

  await step("job_question_options", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS job_question_options (
        id           TEXT    PRIMARY KEY,
        question_id  TEXT    NOT NULL REFERENCES job_questions(id) ON DELETE CASCADE,
        sequence     INTEGER NOT NULL DEFAULT 0,
        label        TEXT    NOT NULL
      )
    `;
  }).catch(() => { failed = true; });

  await step("application_question_answers", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS application_question_answers (
        id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        application_id    UUID    NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        question_id       TEXT    NOT NULL,
        answer_text       TEXT,
        answer_option_ids TEXT[]
      )
    `;
  }).catch(() => { failed = true; });

  // ── 3. Indexes ─────────────────────────────────────────────────────────────
  console.log("\n── Indexes");

  const indexes: [string, string][] = [
    ["idx_jobs_odoo_id",        "ON jobs(odoo_job_id)"],
    ["idx_jobs_is_active",      "ON jobs(is_active)"],
    ["idx_jobs_closing",        "ON jobs(closing_date)"],
    ["idx_experience_application", "ON experience(application_id)"],
    ["idx_education_application",  "ON education(application_id)"],
    ["idx_applications_email",  "ON applications(email)"],
    ["idx_applications_job",    "ON applications(job_id)"],
    ["idx_applications_gsync",  "ON applications(gateway_sync_status)"],
    ["idx_job_questions_job",   "ON job_questions(job_id)"],
    ["idx_jqopts_question",     "ON job_question_options(question_id)"],
    ["idx_aqa_application",     "ON application_question_answers(application_id)"],
  ];

  for (const [name, definition] of indexes) {
    // sql.unsafe is needed because CREATE INDEX doesn't support parameterised
    // names; the values here are hardcoded literals — no injection risk.
    await step(name, async () => {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${name} ${definition}`);
    }).catch(() => { failed = true; });
  }

  // ── 4. updated_at trigger ──────────────────────────────────────────────────
  console.log("\n── Triggers");

  await step("update_updated_at() function", async () => {
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
  }).catch(() => { failed = true; });

  await step("trg_applications_updated_at", async () => {
    await sql`DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications`;
    await sql`
      CREATE TRIGGER trg_applications_updated_at
        BEFORE UPDATE ON applications
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `;
  }).catch(() => { failed = true; });

  await step("trg_jobs_updated_at", async () => {
    await sql`DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs`;
    await sql`
      CREATE TRIGGER trg_jobs_updated_at
        BEFORE UPDATE ON jobs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `;
  }).catch(() => { failed = true; });

  // ── 5. Platform check ──────────────────────────────────────────────────────
  // Check whether we are on Supabase (has storage schema) or plain Neon/PG.
  // Only attempt RLS / bucket setup on Supabase.
  console.log("\n── Platform-specific (RLS / storage)");

  let isSupabase = false;
  try {
    await sql`SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'`;
    const rows = await sql`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'
    `;
    isSupabase = rows.length > 0;
  } catch {
    isSupabase = false;
  }

  if (!isSupabase) {
    console.log("  ↩  Not a Supabase instance — skipping storage bucket and RLS policies");
    console.log("     (Neon does not require RLS; access control is enforced in the API layer)");
  } else {
    await step("storage bucket: application-files", async () => {
      await sql`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('application-files', 'application-files', false)
        ON CONFLICT (id) DO NOTHING
      `;
    }).catch(() => { failed = true; });

    for (const table of ["jobs", "applications", "experience", "education"] as const) {
      await step(`RLS enable on ${table}`, async () => {
        await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      }).catch(() => { failed = true; });
    }

    const policies: Array<{ name: string; sql: string }> = [
      {
        name: "Public read active jobs",
        sql: `
          CREATE POLICY IF NOT EXISTS "Public read active jobs" ON jobs
            FOR SELECT USING (
              is_active = true AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
            )`,
      },
      {
        name: "Allow anonymous insert on applications",
        sql: `CREATE POLICY IF NOT EXISTS "Allow anonymous insert on applications" ON applications FOR INSERT WITH CHECK (true)`,
      },
      {
        name: "Allow anonymous update on applications",
        sql: `CREATE POLICY IF NOT EXISTS "Allow anonymous update on applications" ON applications FOR UPDATE USING (true) WITH CHECK (true)`,
      },
      {
        name: "Allow anonymous insert on experience",
        sql: `CREATE POLICY IF NOT EXISTS "Allow anonymous insert on experience" ON experience FOR INSERT WITH CHECK (true)`,
      },
      {
        name: "Allow anonymous insert on education",
        sql: `CREATE POLICY IF NOT EXISTS "Allow anonymous insert on education" ON education FOR INSERT WITH CHECK (true)`,
      },
    ];

    for (const { name, sql: policySQL } of policies) {
      await step(`policy: ${name}`, async () => {
        await sql.unsafe(policySQL);
      }).catch(() => { failed = true; });
    }
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  await sql.end();

  if (failed) {
    console.error("\n[migrate] ✗ Migration completed with errors. See above.");
    process.exit(1);
  }

  console.log("\n[migrate] ✓ Migration complete.");
}

main().catch((err) => {
  console.error("[migrate] Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
