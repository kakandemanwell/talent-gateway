import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import sql from "../db.js";

interface JobRow {
  id: string;
  odoo_job_id: string;
  title: string;
  department: string | null;
  location: string | null;
  closing_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const publicJobsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/jobs ─────────────────────────────────────────────────────────
  // Returns all active, non-expired jobs for the public portal.
  // Mirrors the Supabase RLS policy: is_active = true AND closing_date >= today (or null).
  fastify.get("/jobs", async (_request, reply) => {
    const jobs = await sql<JobRow[]>`
      SELECT id, odoo_job_id, title, department, location,
             closing_date, description, is_active, created_at, updated_at
      FROM jobs
      WHERE is_active = true
        AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
      ORDER BY created_at DESC
    `;
    reply.send(jobs);
  });

  // ── GET /api/jobs/:id ─────────────────────────────────────────────────────
  // Returns a single active job by its UUID.
  fastify.get(
    "/jobs/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply
    ) => {
      const { id } = request.params;

      const rows = await sql<JobRow[]>`
        SELECT id, odoo_job_id, title, department, location,
               closing_date, description, is_active, created_at, updated_at
        FROM jobs
        WHERE id = ${id}
          AND is_active = true
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.status(404).send({ error: "Job not found" });
      }

      reply.send(rows[0]);
    }
  );
};

export default publicJobsRoutes;
