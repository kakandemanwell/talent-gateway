import { get as getBlob } from "@vercel/blob";
import sql from "../../_lib/db.js";
import { bearerAuth } from "../../_lib/auth.js";
import { getBlobStoreAccess } from "../../_lib/storage.js";

export const config = { runtime: "nodejs" };

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
async function handleRequest(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const url = new URL(request.url);

  // Extract segments after the /files/ prefix.
  // Vercel rewrites keep the original request URL in request.url, so the
  // pathname may be either /functions/v1/files/... (client-facing) or
  // /api/odoo/files/... (direct). Strip everything up to and including /files/.
  const pathAfterFiles = url.pathname.replace(/.*\/files\//, "");
  const segments = pathAfterFiles.split("/").filter(Boolean);

  if (segments.length < 2) {
    return Response.json({ error: "Invalid file path" }, { status: 400 });
  }

  // Guard against path traversal
  if (segments.some((s) => s === "..")) {
    return Response.json({ error: "Invalid file path" }, { status: 400 });
  }

  const [applicationId, fileType, fileRef] = segments;

  try {
    let blobUrl: string | null = null;

    if (fileType === "cv") {
      const rows = await sql`
        SELECT cv_file_path FROM applications WHERE id = ${applicationId}
      ` as Array<{ cv_file_path: string | null }>;
      blobUrl = rows[0]?.cv_file_path ?? null;

    } else if (fileType === "accolades") {
      const rows = fileRef
        ? await sql`
            SELECT accolade_file_path FROM education
            WHERE application_id = ${applicationId}
              AND id = ${fileRef}
              AND accolade_file_path IS NOT NULL
          ` as Array<{ accolade_file_path: string }>
        : await sql`
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

    if (getBlobStoreAccess() === "public") {
      return Response.redirect(blobUrl, 302);
    }

    const blob = await getBlob(blobUrl, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", blob.blob.contentType || "application/octet-stream");
    headers.set("Content-Disposition", blob.blob.contentDisposition);
    headers.set("Cache-Control", blob.blob.cacheControl);
    headers.set("ETag", blob.blob.etag);

    return new Response(blob.stream, { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleRequest(request);
}
