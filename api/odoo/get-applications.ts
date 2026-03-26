import sql from "../_lib/db.js";
import { bearerAuth } from "../_lib/auth.js";
import { presignFile } from "../_lib/storage.js";
import { padToFullDate } from "../_lib/helpers.js";

export const config = { runtime: 'edge' };

/**
 * GET /functions/v1/odoo-get-applications
 *
 * Called by Odoo daily cron (5 PM EAT) or on-demand to pull pending
 * applications.  Returns structured application data with direct Vercel
 * Blob URLs for CV and accolade files — no proxy, no URL expiry.
 *
 * Query params:
 *   job_ids          — comma-separated odoo_job_id values (required unless
 *                      application_refs is supplied)
 *   status           — gateway_sync_status filter; defaults to "new"
 *   application_refs — comma-separated application UUIDs; bypasses
 *                      job_ids/status and fetches those exact records with
 *                      refreshed file URLs (Odoo retry workflow)
 */
export default async function handler(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const jobIdsParam   = url.searchParams.get("job_ids");
  const statusFilter  = url.searchParams.get("status") ?? "new";
  const appRefsParam  = url.searchParams.get("application_refs");

  try {
    let apps: Array<{
      id: string; job_id: string; full_name: string; email: string;
      phone: string; summary: string | null; cv_file_path: string | null;
      gateway_sync_status: string; created_at: string;
    }>;

    let jobMap: Record<string, { odoo_job_id: string; closing_date: string | null }>;

    if (appRefsParam) {
      // ── application_refs mode ──────────────────────────────────────────
      const applicationRefs = appRefsParam.split(",").map((r) => r.trim()).filter(Boolean);
      if (applicationRefs.length === 0) {
        return Response.json({ error: "application_refs must contain at least one value" }, { status: 422 });
      }

      apps = await sql`
        SELECT id, job_id, full_name, email, phone, summary, cv_file_path,
               gateway_sync_status, created_at
        FROM applications
        WHERE id = ANY(${applicationRefs})
      ` as typeof apps;

      if (apps.length === 0) {
        return Response.json({ applications: [], total: 0, fetched_at: new Date().toISOString() });
      }

      const jobUuids = [...new Set(apps.map((a) => a.job_id))];
      const jobRows = await sql`
        SELECT id, odoo_job_id, closing_date FROM jobs WHERE id = ANY(${jobUuids})
      ` as Array<{ id: string; odoo_job_id: string; closing_date: string | null }>;
      jobMap = Object.fromEntries(jobRows.map((j) => [j.id, { odoo_job_id: j.odoo_job_id, closing_date: j.closing_date }]));

    } else {
      // ── Normal mode: filter by job_ids + gateway_sync_status ──────────
      if (!jobIdsParam) {
        return Response.json({ error: "job_ids query parameter is required" }, { status: 422 });
      }
      const odooJobIds = jobIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (odooJobIds.length === 0) {
        return Response.json({ error: "job_ids must contain at least one value" }, { status: 422 });
      }

      const jobRows = await sql`
        SELECT id, odoo_job_id, closing_date FROM jobs WHERE odoo_job_id = ANY(${odooJobIds})
      ` as Array<{ id: string; odoo_job_id: string; closing_date: string | null }>;

      if (jobRows.length === 0) {
        return Response.json({ applications: [], total: 0, fetched_at: new Date().toISOString() });
      }

      const jobUuids = jobRows.map((j) => j.id);
      jobMap = Object.fromEntries(jobRows.map((j) => [j.id, { odoo_job_id: j.odoo_job_id, closing_date: j.closing_date }]));

      apps = await sql`
        SELECT id, job_id, full_name, email, phone, summary, cv_file_path,
               gateway_sync_status, created_at
        FROM applications
        WHERE job_id = ANY(${jobUuids})
          AND gateway_sync_status = ${statusFilter}
      ` as typeof apps;

      if (apps.length === 0) {
        return Response.json({ applications: [], total: 0, fetched_at: new Date().toISOString() });
      }
    }

    // ── Bulk-fetch related rows ────────────────────────────────────────────
    const appIds = apps.map((a) => a.id);

    const [experiences, educations, questionAnswers] = await Promise.all([
      sql`
        SELECT application_id, position, employer, description,
               start_date, end_date, is_current, years
        FROM experience WHERE application_id = ANY(${appIds})
      `,
      sql`
        SELECT application_id, qualification, level, field_of_study,
               institution, year_completed, accolade_file_path
        FROM education WHERE application_id = ANY(${appIds})
      `,
      sql`
        SELECT application_id, question_id, answer_text, answer_option_ids
        FROM application_question_answers WHERE application_id = ANY(${appIds})
      `,
    ]);

    // Group by application_id
    const expByApp = new Map<string, Record<string, unknown>[]>();
    for (const exp of experiences) {
      const list = expByApp.get(exp.application_id as string) ?? [];
      list.push(exp as Record<string, unknown>);
      expByApp.set(exp.application_id as string, list);
    }
    const eduByApp = new Map<string, Record<string, unknown>[]>();
    for (const edu of educations) {
      const list = eduByApp.get(edu.application_id as string) ?? [];
      list.push(edu as Record<string, unknown>);
      eduByApp.set(edu.application_id as string, list);
    }
    const qaByApp = new Map<string, Record<string, unknown>[]>();
    for (const qa of questionAnswers) {
      const list = qaByApp.get(qa.application_id as string) ?? [];
      list.push(qa as Record<string, unknown>);
      qaByApp.set(qa.application_id as string, list);
    }

    // ── Build response ─────────────────────────────────────────────────────
    const applications = await Promise.all(
      apps.map(async (app) => {
        // presignFile is a passthrough — returns the stored blob URL as-is
        const cvSigned = presignFile(app.cv_file_path);

        const appExperience = (expByApp.get(app.id) ?? []).map((exp) => ({
          position:    exp.position,
          employer:    exp.employer,
          description: exp.description,
          start_date:  padToFullDate(exp.start_date as string | null),
          end_date:    exp.is_current ? null : padToFullDate(exp.end_date as string | null),
          is_current:  exp.is_current ?? false,
          years:       exp.years,
        }));

        const appEducation = await Promise.all(
          (eduByApp.get(app.id) ?? []).map(async (edu) => {
            const accoInfo = presignFile(edu.accolade_file_path as string | null);
            return {
              qualification: edu.qualification,
              level:         edu.level,
              field_of_study: edu.field_of_study,
              institution:   edu.institution,
              year_completed: edu.year_completed,
              accolade_url:  accoInfo?.signedUrl ?? null,
            };
          })
        );

        const appQuestionAnswers = (qaByApp.get(app.id) ?? []).map((qa) => {
          const optIds = (qa.answer_option_ids as string[] | null) ?? [];
          if (qa.answer_text !== null) {
            return { question_id: qa.question_id, type: "text", answer: qa.answer_text };
          }
          if (optIds.length === 1) {
            return { question_id: qa.question_id, answer: optIds[0] };
          }
          return { question_id: qa.question_id, answers: optIds };
        });

        const jobMeta = jobMap[app.job_id];

        return {
          application_ref: app.id,
          job_id:          jobMeta?.odoo_job_id ?? null,
          submitted_at:    app.created_at,
          personal: {
            full_name: app.full_name,
            email:     app.email,
            phone:     app.phone,
          },
          summary:              app.summary,
          cv_url:               cvSigned?.signedUrl ?? null,
          cv_url_expires_at:    null,   // Vercel Blob URLs do not expire
          experience:           appExperience,
          education:            appEducation,
          question_answers:     appQuestionAnswers,
        };
      })
    );

    return Response.json({
      applications,
      total: applications.length,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
