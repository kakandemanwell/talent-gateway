import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Neon serverless HTTP driver.
 *
 * Uses Neon's own HTTP transport instead of a TCP postgres connection.
 * This eliminates TCP cold-start hangs in Vercel Serverless Functions —
 * each query is a plain HTTPS request, so there is no connection pool or
 * idle timeout to worry about.
 */
const sql = neon(DATABASE_URL);

export default sql;
