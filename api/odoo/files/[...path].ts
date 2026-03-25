import sql from "../../_lib/db.js";
import { bearerAuth } from "../../_lib/auth.js";

/**
 * GET /functions/v1/files/:path*
 *
 * Backward-compatible file-access endpoint for Odoo.
 *
 * With Vercel Blob, files are served directly from Vercel's CDN and the full
 * blob URL is stored in the database.  This route parses the application ID
 * from the request path, looks up the stored blob URL, enforces Bearer auth,
 * then issues a 302 redirect so Odoo's HTTP client follows to the CDN.
 *
 * Path format (same as before):
 *   /functions/v1/files/{applicationId}/cv/{filename}
 *   /functions/v1/files/{applicationId}/accolades/{filename}
 *
 * The vercel.json rewrite maps the above to:
 *   /api/odoo/files/{applicationId}/cv/{filename}
 *   /api/odoo/files/{applicationId}/accolades/{filename}
 *
 * Only the first two path segments (applicationId + type) are used for the
 * DB lookup; the filename portion is informational.
 */
export default async function handler(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const url = new URL(request.url);

  // Extract segments after /api/odoo/files/
  // URL shape: /api/odoo/files/<applicationId>/<type>/...
  const pathAfterFiles = url.pathname.replace(/.*\/api\/odoo\/files\//, "");
  const segments = pathAfterFiles.split("/").filter(Boolean);

  if (segments.length < 2) {
    return Response.json({ error: "Invalid file path" }, { status: 400 });
  }

  // Guard against path traversal
  if (segments.some((s) => s === "..")) {
    return Response.json({ error: "Invalid file path" }, { status: 400 });
  }

  const [applicationId, fileType] = segments;

  try {
    let blobUrl: string | null = null;

    if (fileType === "cv") {
      const rows = await sql`
        SELECT cv_file_path FROM applications WHERE id = ${applicationId}
      ` as Array<{ cv_file_path: string | null }>;
      blobUrl = rows[0]?.cv_file_path ?? null;

    } else if (fileType === "accolades") {
      // For accolades, the 3rd segment is an index or filename.
      // We return the first accolade for this application if no index is
      // available; Odoo uses the url from the get-applications response anyway.
      const rows = await sql`
        SELECT accolade_file_path FROM education
        WHERE application_id = ${applicationId}
          AND accolade_file_path IS NOT NULL
        ORDER BY id
      ` as Array<{ accolade_file_path: string }>;
      blobUrl = rows[0]?.accolade_file_path ?? null;
    }

    if (!blobUrl) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    // Redirect the Odoo HTTP client straight to the Vercel Blob CDN URL.
    return Response.redirect(blobUrl, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
