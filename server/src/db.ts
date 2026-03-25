import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Shared postgres.js connection pool.
 * postgres() creates a lazy pool — connections are opened on first query
 * and automatically released back to the pool.
 */
const sql = postgres(DATABASE_URL, {
  max: 10,            // max pool size
  idle_timeout: 30,   // close idle connections after 30 s
  connect_timeout: 10,
  transform: {
    // Return JS Date objects for timestamp columns
    undefined: null,
  },
});

export default sql;
