import sql from "../_lib/db.js";
import { bearerAuth } from "../_lib/auth.js";

/**
 * PATCH /functions/v1/odoo-patch-application
 *
 * Called by Odoo after successfully creating hr.applicant.
 * Marks the gateway record as imported (idempotent).
 */
export default async function handler(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { application_ref?: unknown; status?: unknown; odoo_applicant_id?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { application_ref, status, odoo_applicant_id } = body;

  if (!application_ref || typeof application_ref !== "string") {
    return Response.json(
      { error: "application_ref is required and must be a string" },
      { status: 422 }
    );
  }

  const allowedStatuses = ["imported", "failed", "new"];
  const resolvedStatus =
    typeof status === "string" && allowedStatuses.includes(status)
      ? status
      : "imported";

  try {
    let rows: Array<{ id: string }>;

    if (typeof odoo_applicant_id === "number") {
      rows = await sql`
        UPDATE applications
        SET gateway_sync_status = ${resolvedStatus},
            odoo_applicant_id   = ${odoo_applicant_id},
            updated_at          = now()
        WHERE id = ${application_ref}
        RETURNING id
      ` as typeof rows;
    } else {
      rows = await sql`
        UPDATE applications
        SET gateway_sync_status = ${resolvedStatus},
            updated_at          = now()
        WHERE id = ${application_ref}
        RETURNING id
      ` as typeof rows;
    }

    if (rows.length === 0) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }

    return Response.json({ success: true, application_ref, status: resolvedStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
