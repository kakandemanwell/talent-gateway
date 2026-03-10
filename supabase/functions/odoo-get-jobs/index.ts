// Edge Function: odoo-get-jobs
// Returns all jobs currently held on the server.
// Used by Odoo for sync health checks and the "Test Connection" button.
//
// GET /functions/v1/odoo-get-jobs
// Authorization: Bearer {ODOO_API_KEY}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authError = validateBearer(req);
  if (authError) return authError;

  // HEAD request — used by Odoo's "Test Connection" button (step 2 in plan)
  // Just confirm auth is valid and the service is up.
  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Fetch all jobs ────────────────────────────────────────────────────────
  const supabase = serviceClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("odoo_job_id, title, is_active, closing_date, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("jobs fetch error:", error.message);
    return json({ error: "Database error", detail: error.message }, 500);
  }

  return json({ jobs: jobs ?? [], total: (jobs ?? []).length }, 200);
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
