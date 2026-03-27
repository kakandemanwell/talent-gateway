/**
 * POST /api/blob/upload
 *
 * Server-side proxy upload to Vercel Blob.
 *
 * The browser sends a multipart/form-data body with two fields:
 *   - file:     the file bytes
 *   - pathname: the destination path (e.g. "applications/cv/123_resume.pdf")
 *
 * This Edge function streams the file straight to Vercel Blob's internal API
 * using the server-side RW token — no CORS, no client token ceremony.
 *
 * Returns: { url: string }  — the blob URL returned by Vercel Blob.
 */
import { corsHeaders, handleOptions } from "../_lib/helpers.js";
import { getBlobStoreAccess } from "../_lib/storage.js";

export const config = { runtime: "edge" };

// Vercel Blob upload endpoint — Vercel sets VERCEL_BLOB_API_URL automatically
// in Edge/serverless environments; fall back to the known CDN base URL.
const BLOB_API_URL = process.env.VERCEL_BLOB_API_URL ?? "https://blob.vercel-storage.com";
const BLOB_API_VERSION = "12";
const BLOB_STORE_ACCESS = getBlobStoreAccess();

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }

  const rwToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!rwToken) {
    return Response.json({ error: "Blob storage not configured" }, { status: 500, headers: corsHeaders(request) });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data body" }, { status: 400, headers: corsHeaders(request) });
  }

  const file = formData.get("file") as File | null;
  const pathname = formData.get("pathname") as string | null;

  if (!file || !pathname) {
    return Response.json({ error: "file and pathname are required" }, { status: 422, headers: corsHeaders(request) });
  }

  // Forward the raw file to Vercel Blob using the server RW token.
  // PUT /<pathname> with Authorization: Bearer <rwToken>
  const blobRes = await fetch(`${BLOB_API_URL}/${pathname}`, {
    method: "PUT",
    headers: {
      "authorization": `Bearer ${rwToken}`,
      "x-api-version": BLOB_API_VERSION,
      "x-vercel-blob-access": BLOB_STORE_ACCESS,
      "x-add-random-suffix": "0",
      "content-type": file.type || "application/octet-stream",
    },
    body: file.stream(),
    // @ts-expect-error -- Edge fetch supports duplex streaming
    duplex: "half",
  });

  if (!blobRes.ok) {
    let msg = blobRes.statusText;
    try {
      const errBody = (await blobRes.json()) as { error?: { message?: string } };
      msg = errBody.error?.message ?? msg;
    } catch { /* ignore */ }
    return Response.json({ error: `Blob upload failed: ${msg}` }, { status: blobRes.status, headers: corsHeaders(request) });
  }

  const result = (await blobRes.json()) as { url: string; pathname: string };
  return Response.json({ url: result.url }, { headers: corsHeaders(request) });
}
