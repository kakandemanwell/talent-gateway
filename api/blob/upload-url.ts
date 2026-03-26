import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { corsHeaders, handleOptions } from "../_lib/helpers.js";

// Runs as Node.js serverless (not Edge) because @vercel/blob uses Node.js
// built-ins (stream, crypto, etc.) that are unavailable in the Edge runtime.
// The token-exchange payload is tiny so the Node.js cold-start is acceptable.

/**
 * POST /api/blob/upload-url
 *
 * Issues a short-lived client upload token so the browser can PUT files
 * directly to Vercel Blob without routing the bytes through this function.
 *
 * This endpoint is internal — it is only called by the submission form, not
 * by Odoo.  No bearer auth is required; the token lifetime (default 30 s) and
 * the allowedContentTypes / maximumSizeInBytes constraints are the gate.
 *
 * Flow:
 *   1. Browser calls POST /api/blob/upload-url with { filename, contentType }
 *      embedded in the handleUpload protocol body.
 *   2. This function calls handleUpload() to generate a client upload token.
 *   3. Browser calls put(url, file, { handleUploadUrl }) using @vercel/blob/client.
 *   4. Vercel Blob returns a blob URL to the browser.
 *   5. Browser includes the blob URL in the application JSON payload sent to
 *      POST /api/applications (no file bytes hit the serverless function).
 */
export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => ({
        allowedContentTypes: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg",
          "image/png",
          "image/webp",
        ],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
        // Store under a predictable path prefix so blob listing is easy
        addRandomSuffix: true,
      }),
      onUploadCompleted: async ({ blob }) => {
        // The application route stores the URL; nothing to record here yet.
        console.log("[blob] upload completed:", blob.url);
      },
    });

    return Response.json(jsonResponse, { headers: corsHeaders(request) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 400, headers: corsHeaders(request) });
  }
}
