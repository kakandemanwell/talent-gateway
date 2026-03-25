import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * postgres.js connection for Neon serverless.
 *
 * Key settings for Neon:
 *   prepare: false  — Neon's HTTP pooler does not support prepared statements
 *   max: 1          — each Vercel Serverless invocation is single-request;
 *                     a pool of 1 avoids exhausting Neon's free-tier connection limit
 *
 * Use Neon's pooler connection string (host ends with -pooler.neon.tech) so
 * that short-lived serverless connections don't pile up on pgBouncer.
 */
const sql = postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  transform: {
    undefined: null,
  },
});

export default sql;
