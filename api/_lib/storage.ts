/**
 * Vercel Blob storage helpers.
 *
 * Upload strategy
 * ───────────────
 * Files are uploaded *client-side* directly to Vercel Blob.  The browser calls
 * POST /api/blob/upload-url to obtain a short-lived client token, then streams
 * the file straight to Vercel's CDN — the serverless function never touches the
 * file bytes.  This keeps the Vercel request payload well under the 4.5 MB
 * serverless body limit.
 *
 * What is stored in the database
 * ───────────────────────────────
 * The `cv_file_path` and `accolade_file_path` columns now hold the **full
 * Vercel Blob CDN URL** returned by the client upload.  There is no separate
 * "path" abstraction: the URL is the canonical reference.
 *
 * Serving files to Odoo
 * ──────────────────────
 * Vercel Blob public URLs are direct CDN links (they contain a random content
 * hash and are unguessable).  `getFileUrl` simply returns the stored URL; no
 * signing step is needed.  The file-proxy endpoint at /functions/v1/files/*
 * remains available for backward compatibility with existing Odoo config — it
 * enforces bearer auth and issues a 302 redirect to the blob URL.
 */

/**
 * Returns a { signedUrl, expiresAt } object compatible with the shape expected
 * by the odoo-get-applications route.
 *
 * With Vercel Blob the URL is already permanent and publicly accessible via
 * CDN, so no presigning/expiry is needed.  expiresAt is null.
 */
export function presignFile(
  blobUrl: string | null | undefined
): { signedUrl: string; expiresAt: string | null } | null {
  if (!blobUrl) return null;
  return { signedUrl: blobUrl, expiresAt: null };
}
