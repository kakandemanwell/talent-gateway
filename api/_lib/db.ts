/**
 * api/_lib/db.ts
 *
 * Minimal Neon HTTP SQL client — pure fetch, zero npm dependencies.
 *
 * Neon exposes a PostgreSQL-over-HTTPS endpoint at:
 *   POST https://<host>/sql
 * Full spec: https://neon.tech/docs/serverless/serverless-driver#use-the-neon-serverless-driver-over-http
 *
 * Auth:    Authorization: Bearer <user>:<password>  (userinfo from DATABASE_URL)
 * Body:    { query: string, params: unknown[] }
 * Response:{ rows: Row[], fields: ... }
 *
 * Zero npm dependencies — safe for Vercel Edge Functions.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const parsed = new URL(DATABASE_URL);
const SQL_ENDPOINT = `https://${parsed.hostname}/sql`;
// Neon expects   Authorization: Bearer <role>:<password>
const BEARER = `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`;

type Row = Record<string, unknown>;

async function executeQuery<T extends Row = Row>(
  query: string,
  params: unknown[],
): Promise<T[]> {
  const res = await fetch(SQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BEARER}`,
    },
    body: JSON.stringify({ query, params }),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      // ignore parse failure, fall back to statusText
    }
    throw new Error(`Neon query failed (${res.status}): ${message}`);
  }

  const data = (await res.json()) as { rows: T[] };
  return data.rows;
}

/**
 * Tagged-template SQL function — identical call signature to neon() from
 * @neondatabase/serverless. Interpolated values become positional parameters
 * ($1, $2 …) so no user input ever reaches the query string directly.
 *
 * Example:
 *   const rows = await sql`SELECT * FROM jobs WHERE id = ${jobId}`;
 */
function sql<T extends Row = Row>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  let query = "";
  const params: unknown[] = [];

  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      query += `$${params.length}`;
    }
  }

  return executeQuery<T>(query, params);
}

export default sql;

