import { config, handleOdooFileRequest } from "./_shared.js";

/**
 * GET /functions/v1/files/:path*
 *
 * Backward-compatible file-access endpoint for Odoo.
 *
 * With Vercel Blob, the full blob URL is stored in the database. This route
 * parses the application ID from the request path, looks up the stored blob
 * URL, enforces Bearer auth, then either redirects to a public blob or streams
 * a private blob through the gateway.
 *
 * Path format (same as before):
 *   /functions/v1/files/{applicationId}/cv/{filename}
 *   /functions/v1/files/{applicationId}/accolades/{filename}
 *
 * The vercel.json rewrite maps the above to:
 *   /api/odoo/files/{applicationId}/cv/{filename}
 *   /api/odoo/files/{applicationId}/accolades/{filename}
 *
 * For accolades, a third path segment may contain the education row ID.
 */
export async function GET(request: Request): Promise<Response> {
  return handleOdooFileRequest(request);
}
