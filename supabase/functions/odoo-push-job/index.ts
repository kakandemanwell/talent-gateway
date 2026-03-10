// Edge Function: odoo-push-job
// Called by Odoo on hr.job create / write / archive.
// Upserts the job record into the Supabase jobs table.
//
// POST /functions/v1/odoo-push-job
// Authorization: Bearer {ODOO_API_KEY}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authError = validateBearer(req);
  if (authError) return authError;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { job_id, title, department, location, closing_date, description, is_active } = body;

  if (!job_id || typeof job_id !== "string") {
    return json({ error: "job_id is required and must be a string" }, 422);
  }
  if (!title || typeof title !== "string") {
    return json({ error: "title is required and must be a string" }, 422);
  }

  // ── DB upsert ─────────────────────────────────────────────────────────────
  const supabase = serviceClient();

  const { data, error } = await supabase
    .from("jobs")
    .upsert(
      {
        odoo_job_id:  job_id,
        title:        title,
        department:   typeof department === "string" ? department : null,
        location:     typeof location === "string" ? location : null,
        closing_date: typeof closing_date === "string" ? closing_date : null,
        description:  typeof description === "string" ? description : null,
        is_active:    typeof is_active === "boolean" ? is_active : true,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: "odoo_job_id" }
    )
    .select("id, odoo_job_id")
    .single();

  if (error) {
    console.error("DB upsert error:", error.message);
    return json({ error: "Database error", detail: error.message }, 500);
  }

  return json({ success: true, id: data.id, odoo_job_id: data.odoo_job_id }, 200);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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
