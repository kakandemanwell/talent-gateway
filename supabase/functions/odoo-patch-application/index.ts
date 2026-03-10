// Edge Function: odoo-patch-application
// Called by Odoo after successfully creating hr.applicant — marks the
// gateway record as imported so it is not returned in future GET requests.
// Idempotent: safe to call multiple times with the same data.
//
// PATCH /functions/v1/odoo-patch-application
// Authorization: Bearer {ODOO_API_KEY}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "PATCH") {
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

  const { application_ref, status, odoo_applicant_id } = body;

  if (!application_ref || typeof application_ref !== "string") {
    return json({ error: "application_ref is required and must be a string" }, 422);
  }

  const allowedStatuses = ["imported", "failed", "new"];
  const resolvedStatus =
    typeof status === "string" && allowedStatuses.includes(status) ? status : "imported";

  // ── DB update ─────────────────────────────────────────────────────────────
  const supabase = serviceClient();

  const updatePayload: Record<string, unknown> = {
    gateway_sync_status: resolvedStatus,
    updated_at: new Date().toISOString(),
  };

  if (typeof odoo_applicant_id === "number") {
    updatePayload.odoo_applicant_id = odoo_applicant_id;
  }

  const { error, count } = await supabase
    .from("applications")
    .update(updatePayload)
    .eq("id", application_ref);

  if (error) {
    console.error("patch application error:", error.message);
    return json({ error: "Database error", detail: error.message }, 500);
  }

  if (count === 0) {
    return json({ error: "Application not found" }, 404);
  }

  return json({ success: true, application_ref, status: resolvedStatus }, 200);
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
