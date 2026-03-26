import sql from "../_lib/db.js";
import { corsHeaders, handleOptions } from "../_lib/helpers.js";

export const config = { runtime: 'edge' };

/**
 * GET /api/jobs
 *
 * Returns all active, non-expired jobs for the public portal.
 */
export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }

  try {
    const jobs = await sql`
      SELECT id, odoo_job_id, title, department, location,
             closing_date, description, skills, is_active, created_at, updated_at
      FROM jobs
      WHERE is_active = true
        AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
      ORDER BY created_at DESC
    `;
    return Response.json(jobs, { headers: corsHeaders(request) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders(request) });
  }
}
