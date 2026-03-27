/**
 * Vercel Blob storage helpers.
 *
 * Upload strategy
 * ───────────────
 * Files are uploaded through POST /api/blob/upload. The browser sends
 * multipart/form-data to a server-side proxy which streams the bytes to Vercel
 * Blob using the project RW token, then stores the resulting blob URL.
 *
 * POST /api/blob/upload-url remains available only as a backwards-compatible
 * token endpoint for older cached frontend bundles.
 *
 * What is stored in the database
 * ───────────────────────────────
 * The `cv_file_path` and `accolade_file_path` columns hold the **full Vercel
 * Blob URL** returned by the upload step. There is no separate "path"
 * abstraction: the URL is the canonical reference.
 *
 * Serving files to Odoo
 * ──────────────────────
 * Public blob stores can return the stored URL directly. Private blob stores
 * must be served through an authenticated proxy route under /functions/v1/files/*.
 */

export type BlobStoreAccess = "public" | "private";

export function getBlobStoreAccess(): BlobStoreAccess {
  return process.env.BLOB_STORE_ACCESS === "public" ? "public" : "private";
}

/**
 * Returns a { signedUrl, expiresAt } object compatible with the shape expected
 * by the odoo-get-applications route.
 *
 * For public blob stores the stored URL can be returned directly. For private
 * blob stores the caller should pass a proxy URL that will stream the blob
 * through an authenticated server route. expiresAt is null in both cases.
 */
export function presignFile(
  blobUrl: string | null | undefined,
  proxyUrl?: string | null,
): { signedUrl: string; expiresAt: string | null } | null {
  if (!blobUrl) return null;
  const signedUrl = getBlobStoreAccess() === "private" ? (proxyUrl ?? blobUrl) : blobUrl;
  return { signedUrl, expiresAt: null };
}
