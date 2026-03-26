import sql from "../_lib/db.js";
import { bearerAuth } from "../_lib/auth.js";

export const config = { runtime: 'edge' };

/**
 * GET  /functions/v1/odoo-get-jobs  → rewrites to this function
 * HEAD /functions/v1/odoo-get-jobs  → used by Odoo's "Test Connection" button
 * POST /functions/v1/odoo-push-job  → is a separate file (odoo/push-job.ts)
 *
 * Note: Vercel cannot serve HEAD and GET from the same file at the same path.
 * We handle HEAD here by returning 200 with no body.
 */
export default async function handler(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method === "HEAD") {
    return new Response(null, { status: 200 });
  }

  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const jobs = await sql`
      SELECT odoo_job_id, title, is_active, closing_date, created_at, updated_at
      FROM jobs
      ORDER BY created_at DESC
    `;
    return Response.json({ jobs, total: jobs.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
