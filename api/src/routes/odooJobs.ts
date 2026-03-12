import type { FastifyPluginAsync } from "fastify";
import sql from "../db.js";
import { bearerAuth } from "../middleware/bearerAuth.js";

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

interface PushJobBody {
  job_id?: unknown;
  title?: unknown;
  department?: unknown;
  location?: unknown;
  closing_date?: unknown;
  description?: unknown;
  is_active?: unknown;
}

const odooJobsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── HEAD /functions/v1/odoo-get-jobs ──────────────────────────────────────
  // Used by Odoo's "Test Connection" button — just confirms auth + service up.
  fastify.head(
    "/functions/v1/odoo-get-jobs",
    { preHandler: bearerAuth },
    async (_request, reply) => {
      reply.status(200).send();
    }
  );

  // ── GET /functions/v1/odoo-get-jobs ───────────────────────────────────────
  // Returns all jobs. Used by Odoo for sync health checks.
  fastify.get(
    "/functions/v1/odoo-get-jobs",
    { preHandler: bearerAuth },
    async (_request, reply) => {
      const jobs = await sql<JobRow[]>`
        SELECT odoo_job_id, title, is_active, closing_date, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC
      `;
      reply.send({ jobs, total: jobs.length });
    }
  );

  // ── POST /functions/v1/odoo-push-job ──────────────────────────────────────
  // Called by Odoo on hr.job create / write / archive.
  // Upserts the job record keyed on odoo_job_id.
  fastify.post<{ Body: PushJobBody }>(
    "/functions/v1/odoo-push-job",
    { preHandler: bearerAuth },
    async (request, reply) => {
      const body = request.body as PushJobBody;

      if (!body.job_id || typeof body.job_id !== "string") {
        return reply
          .status(422)
          .send({ error: "job_id is required and must be a string" });
      }
      if (!body.title || typeof body.title !== "string") {
        return reply
          .status(422)
          .send({ error: "title is required and must be a string" });
      }

      const department =
        typeof body.department === "string" ? body.department : null;
      const location =
        typeof body.location === "string" ? body.location : null;
      const closing_date =
        typeof body.closing_date === "string" ? body.closing_date : null;
      const description =
        typeof body.description === "string" ? body.description : null;
      const is_active =
        typeof body.is_active === "boolean" ? body.is_active : true;

      const rows = await sql<{ id: string; odoo_job_id: string }[]>`
        INSERT INTO jobs (odoo_job_id, title, department, location, closing_date, description, is_active, updated_at)
        VALUES (
          ${body.job_id}, ${body.title}, ${department}, ${location},
          ${closing_date}, ${description}, ${is_active}, now()
        )
        ON CONFLICT (odoo_job_id) DO UPDATE SET
          title        = EXCLUDED.title,
          department   = EXCLUDED.department,
          location     = EXCLUDED.location,
          closing_date = EXCLUDED.closing_date,
          description  = EXCLUDED.description,
          is_active    = EXCLUDED.is_active,
          updated_at   = now()
        RETURNING id, odoo_job_id
      `;

      const row = rows[0];
      reply.send({ success: true, id: row.id, odoo_job_id: row.odoo_job_id });
    }
  );
};

export default odooJobsRoutes;
