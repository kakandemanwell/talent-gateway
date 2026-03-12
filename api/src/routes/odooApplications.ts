import type { FastifyPluginAsync } from "fastify";
import sql from "../db.js";
import { presignFile } from "../storage.js";
import { bearerAuth } from "../middleware/bearerAuth.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApplicationRow {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string;
  summary: string | null;
  cv_file_path: string | null;
  gateway_sync_status: string;
  created_at: string;
}

interface ExperienceRow {
  application_id: string;
  position: string;
  employer: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  years: number | null;
}

interface EducationRow {
  application_id: string;
  qualification: string;
  level: string;
  field_of_study: string;
  institution: string;
  year_completed: number | null;
  accolade_file_path: string | null;
}

interface JobRow {
  id: string;
  odoo_job_id: string;
  closing_date: string | null;
}

interface PatchBody {
  application_ref?: unknown;
  status?: unknown;
  odoo_applicant_id?: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gap 1: Odoo fields.Date requires full ISO "YYYY-MM-DD".
 * The form stores month-picker values as "YYYY-MM" — pad to first of the month.
 * Preserved exactly from the Supabase edge function.
 */
function padToFullDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const odooApplicationsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /functions/v1/odoo-get-applications ──────────────────────────────
  // Called by Odoo daily cron (5 PM EAT) or on-demand.
  // Returns unimported applications (by gateway_sync_status) with signed file URLs.
  // Query params:
  //   job_ids  — comma-separated list of odoo_job_id values e.g. "OD-1,OD-5"
  //   status   — gateway_sync_status filter, defaults to "new"
  fastify.get<{ Querystring: { job_ids?: string; status?: string } }>(
    "/functions/v1/odoo-get-applications",
    { preHandler: bearerAuth },
    async (request, reply) => {
      const { job_ids: jobIdsParam, status: statusFilter = "new" } =
        request.query;

      if (!jobIdsParam) {
        return reply
          .status(422)
          .send({ error: "job_ids query parameter is required" });
      }

      const odooJobIds = jobIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (odooJobIds.length === 0) {
        return reply
          .status(422)
          .send({ error: "job_ids must contain at least one value" });
      }

      // ── Resolve odoo_job_id values → internal UUIDs ──────────────────────
      const jobRows = await sql<JobRow[]>`
        SELECT id, odoo_job_id, closing_date
        FROM jobs
        WHERE odoo_job_id = ANY(${odooJobIds})
      `;

      if (jobRows.length === 0) {
        return reply.send({
          applications: [],
          total: 0,
          fetched_at: new Date().toISOString(),
        });
      }

      const jobUuids = jobRows.map((j) => j.id);
      const jobMap = Object.fromEntries(
        jobRows.map((j) => [j.id, { odoo_job_id: j.odoo_job_id, closing_date: j.closing_date }])
      );

      // ── Fetch applications ────────────────────────────────────────────────
      const apps = await sql<ApplicationRow[]>`
        SELECT id, job_id, full_name, email, phone, summary, cv_file_path,
               gateway_sync_status, created_at
        FROM applications
        WHERE job_id = ANY(${jobUuids})
          AND gateway_sync_status = ${statusFilter}
      `;

      if (apps.length === 0) {
        return reply.send({
          applications: [],
          total: 0,
          fetched_at: new Date().toISOString(),
        });
      }

      // ── Bulk-fetch experience + education for all returned applications ──
      const appIds = apps.map((a) => a.id);

      const [experiences, educations] = await Promise.all([
        sql<ExperienceRow[]>`
          SELECT application_id, position, employer, description,
                 start_date, end_date, is_current, years
          FROM experience
          WHERE application_id = ANY(${appIds})
        `,
        sql<EducationRow[]>`
          SELECT application_id, qualification, level, field_of_study,
                 institution, year_completed, accolade_file_path
          FROM education
          WHERE application_id = ANY(${appIds})
        `,
      ]);

      // Group by application_id for O(1) lookup
      const expByApp = new Map<string, ExperienceRow[]>();
      for (const exp of experiences) {
        const list = expByApp.get(exp.application_id) ?? [];
        list.push(exp);
        expByApp.set(exp.application_id, list);
      }
      const eduByApp = new Map<string, EducationRow[]>();
      for (const edu of educations) {
        const list = eduByApp.get(edu.application_id) ?? [];
        list.push(edu);
        eduByApp.set(edu.application_id, list);
      }

      // ── Build response (presign file URLs) ───────────────────────────────
      const applications = await Promise.all(
        apps.map(async (app) => {
          const cvSigned = await presignFile(app.cv_file_path);

          const appExperience = (expByApp.get(app.id) ?? []).map((exp) => ({
            position: exp.position,
            employer: exp.employer,
            description: exp.description,
            // Gap 1: pad YYYY-MM → YYYY-MM-DD for Odoo fields.Date
            start_date: padToFullDate(exp.start_date),
            end_date: exp.is_current ? null : padToFullDate(exp.end_date),
            is_current: exp.is_current ?? false,
            years: exp.years,
          }));

          const appEducation = await Promise.all(
            (eduByApp.get(app.id) ?? []).map(async (edu) => {
              const accoladeSigned = await presignFile(edu.accolade_file_path);
              return {
                qualification: edu.qualification,
                // Gap 2: level is stored as the Odoo selection key (e.g. "bachelor")
                // The publicApplications route normalises this on insert.
                level: edu.level,
                field_of_study: edu.field_of_study,
                institution: edu.institution,
                year_completed: edu.year_completed,
                accolade_url: accoladeSigned?.signedUrl ?? null,
              };
            })
          );

          const jobMeta = jobMap[app.job_id];

          return {
            application_ref: app.id,
            job_id: jobMeta?.odoo_job_id ?? null,
            submitted_at: app.created_at,
            personal: {
              full_name: app.full_name,
              email: app.email,
              phone: app.phone,
            },
            summary: app.summary,
            cv_url: cvSigned?.signedUrl ?? null,
            cv_url_expires_at: cvSigned?.expiresAt ?? null,
            experience: appExperience,
            education: appEducation,
          };
        })
      );

      reply.send({
        applications,
        total: applications.length,
        fetched_at: new Date().toISOString(),
      });
    }
  );

  // ── PATCH /functions/v1/odoo-patch-application ───────────────────────────
  // Called by Odoo after successfully creating hr.applicant.
  // Marks the gateway record as imported (idempotent).
  fastify.patch<{ Body: PatchBody }>(
    "/functions/v1/odoo-patch-application",
    { preHandler: bearerAuth },
    async (request, reply) => {
      const { application_ref, status, odoo_applicant_id } = request.body;

      if (!application_ref || typeof application_ref !== "string") {
        return reply
          .status(422)
          .send({ error: "application_ref is required and must be a string" });
      }

      const allowedStatuses = ["imported", "failed", "new"];
      const resolvedStatus =
        typeof status === "string" && allowedStatuses.includes(status)
          ? status
          : "imported";

      let rows: { id: string }[];

      if (typeof odoo_applicant_id === "number") {
        rows = await sql<{ id: string }[]>`
          UPDATE applications
          SET gateway_sync_status = ${resolvedStatus},
              odoo_applicant_id   = ${odoo_applicant_id},
              updated_at          = now()
          WHERE id = ${application_ref}
          RETURNING id
        `;
      } else {
        rows = await sql<{ id: string }[]>`
          UPDATE applications
          SET gateway_sync_status = ${resolvedStatus},
              updated_at          = now()
          WHERE id = ${application_ref}
          RETURNING id
        `;
      }

      if (rows.length === 0) {
        return reply.status(404).send({ error: "Application not found" });
      }

      reply.send({
        success: true,
        application_ref,
        status: resolvedStatus,
      });
    }
  );
};

export default odooApplicationsRoutes;
