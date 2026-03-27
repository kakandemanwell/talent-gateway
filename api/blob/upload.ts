/**
 * POST /api/blob/upload
 *
 * Server-side proxy upload to Vercel Blob.
 *
 * The browser sends a multipart/form-data body with two fields:
 *   - file:     the file bytes
 *   - pathname: the destination path (e.g. "applications/cv/123_resume.pdf")
 *
 * This serverless function forwards the uploaded file to Vercel Blob using the
 * official SDK — no CORS, no client token ceremony.
 *
 * Returns: { url: string }  — the blob URL returned by Vercel Blob.
 */
import { put } from "@vercel/blob";
import { corsHeaders, handleOptions } from "../_lib/helpers.js";
import { getBlobStoreAccess } from "../_lib/storage.js";

export const config = { runtime: "nodejs" };

const BLOB_STORE_ACCESS = getBlobStoreAccess();

async function handleRequest(request: Request): Promise<Response> {
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

  const normalizedPathname = pathname
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");

  if (!normalizedPathname) {
    return Response.json({ error: "pathname is required" }, { status: 422, headers: corsHeaders(request) });
  }

  try {
    const result = await put(normalizedPathname, file, {
      access: BLOB_STORE_ACCESS,
      addRandomSuffix: false,
      token: rwToken,
      contentType: file.type || undefined,
    });

    return Response.json({ url: result.url }, { headers: corsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Blob upload failed: ${message}` }, { status: 400, headers: corsHeaders(request) });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleRequest(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleRequest(request);
}
