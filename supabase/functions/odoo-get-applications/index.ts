// Edge Function: odoo-get-applications
// Called by Odoo daily cron (5PM EAT) or on-demand.
// Returns unimported applications with signed file URLs.
//
// GET /functions/v1/odoo-get-applications?job_ids=OD-1,OD-5&status=new
// Authorization: Bearer {ODOO_API_KEY}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const FILES_BUCKET = "application-files";
const SIGNED_URL_TTL = 86400; // 24 hours — gives Odoo cron a full day to download files

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authError = validateBearer(req);
  if (authError) return authError;

  // ── Query params ──────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const jobIdsParam = url.searchParams.get("job_ids"); // "OD-1,OD-5"
  const statusFilter = url.searchParams.get("status") ?? "new";

  if (!jobIdsParam) {
    return json({ error: "job_ids query parameter is required" }, 422);
  }

  const odooJobIds = jobIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (odooJobIds.length === 0) {
    return json({ error: "job_ids must contain at least one value" }, 422);
  }

  const supabase = serviceClient();

  // ── Resolve Odoo job IDs → internal UUIDs ─────────────────────────────────
  const { data: jobRows, error: jobsError } = await supabase
    .from("jobs")
    .select("id, odoo_job_id, closing_date")
    .in("odoo_job_id", odooJobIds);

  if (jobsError) {
    console.error("jobs lookup error:", jobsError.message);
    return json({ error: "Database error", detail: jobsError.message }, 500);
  }

  if (!jobRows || jobRows.length === 0) {
    return json({ applications: [], total: 0, fetched_at: new Date().toISOString() }, 200);
  }

  const jobUuids = jobRows.map((j) => j.id);
  const jobMap: Record<string, { odoo_job_id: string; closing_date: string | null }> =
    Object.fromEntries(jobRows.map((j) => [j.id, { odoo_job_id: j.odoo_job_id, closing_date: j.closing_date }]));

  // ── Fetch applications + relations ────────────────────────────────────────
  const { data: appRows, error: appsError } = await supabase
    .from("applications")
    .select(`
      id,
      job_id,
      full_name,
      email,
      phone,
      summary,
      cv_file_path,
      gateway_sync_status,
      created_at,
      experience ( position, description, employer, start_date, end_date, is_current, years ),
      education  ( qualification, level, field_of_study, institution, year_completed, accolade_file_path )
    `)
    .in("job_id", jobUuids)
    .eq("gateway_sync_status", statusFilter);

  if (appsError) {
    console.error("applications fetch error:", appsError.message);
    return json({ error: "Database error", detail: appsError.message }, 500);
  }

  // ── Generate signed URLs for files ────────────────────────────────────────
  const applications = await Promise.all(
    (appRows ?? []).map(async (app) => {
      const cvUrl = app.cv_file_path
        ? await signedUrl(supabase, app.cv_file_path)
        : null;

      const educationWithUrls = await Promise.all(
        (app.education ?? []).map(async (edu: Record<string, unknown>) => {
          const accoladeUrl =
            typeof edu.accolade_file_path === "string" && edu.accolade_file_path
              ? await signedUrl(supabase, edu.accolade_file_path)
              : null;
          return {
            qualification:  edu.qualification,
            level:          edu.level,   // stored as Odoo key ("bachelor", "master", etc.)
            field_of_study: edu.field_of_study,
            institution:    edu.institution,
            year_completed: edu.year_completed,
            accolade_url:   accoladeUrl,
          };
        })
      );

      const experienceWithDates = (app.experience ?? []).map(
        (exp: Record<string, unknown>) => ({
          position:    exp.position,
          employer:    exp.employer,
          description: exp.description,
          // Gap 1: pad YYYY-MM → YYYY-MM-DD for Odoo fields.Date compatibility
          start_date:  padToFullDate(exp.start_date as string | null),
          end_date:    exp.is_current ? null : padToFullDate(exp.end_date as string | null),
          is_current:  exp.is_current ?? false,
          years:       exp.years,
        })
      );

      const jobMeta = jobMap[app.job_id as string];

      return {
        application_ref: app.id,
        job_id:          jobMeta?.odoo_job_id ?? null,
        submitted_at:    app.created_at,
        personal: {
          full_name: app.full_name,
          email:     app.email,
          phone:     app.phone,
        },
        summary:            app.summary,
        cv_url:             cvUrl?.signedUrl ?? null,
        cv_url_expires_at:  cvUrl?.expiresAt ?? null,
        experience:         experienceWithDates,
        education:          educationWithUrls,
      };
    })
  );

  return json(
    {
      applications,
      total:      applications.length,
      fetched_at: new Date().toISOString(),
    },
    200
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gap 1: Odoo fields.Date requires full ISO "YYYY-MM-DD".
 * The form stores month-picker values as "YYYY-MM" — pad to first of the month.
 */
function padToFullDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // Already full date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Month-only — append first day
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

async function signedUrl(
  supabase: ReturnType<typeof createClient>,
  filePath: string
): Promise<{ signedUrl: string; expiresAt: string } | null> {
  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    console.warn("Failed to sign URL for", filePath, error?.message);
    return null;
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();
  return { signedUrl: data.signedUrl, expiresAt };
}

function validateBearer(req: Request): Response | null {
  const expectedKey = Deno.env.get("ODOO_API_KEY");
  if (!expectedKey) {
    console.error("ODOO_API_KEY secret is not set");
    return json({ error: "Server misconfiguration" }, 500);
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== expectedKey) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
