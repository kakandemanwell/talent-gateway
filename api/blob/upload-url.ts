import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { corsHeaders, handleOptions } from "../_lib/helpers.js";

// Runs as Node.js serverless (not Edge) because @vercel/blob uses Node.js
// built-ins (crypto, stream, etc.) unavailable in the Edge runtime.
//
// Flow: browser POSTs { pathname, contentType } here → server generates a
// short-lived client token → browser uses put() to stream the file directly
// to the Vercel Blob CDN.  No callback mechanism; no round-trips via Vercel.

/**
 * POST /api/blob/upload-url
 *
 * Returns a short-lived client token for a single direct blob upload.
 * Body: { pathname: string, contentType?: string }
 */
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

  try {
    const { pathname, contentType } = (await request.json()) as { pathname: string; contentType?: string };
    if (!pathname) {
      return Response.json({ error: "pathname is required" }, { status: 422, headers: corsHeaders(request) });
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: rwToken,
      pathname,
      allowedContentTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/webp",
        ...(contentType && !contentType.startsWith("text") ? [contentType] : []),
      ],
      maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
      addRandomSuffix: true,
    });

    return Response.json({ clientToken }, { headers: corsHeaders(request) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders(request) });
  }
}
