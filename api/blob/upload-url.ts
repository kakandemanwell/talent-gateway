// No @vercel/blob import — that package imports Node.js `crypto` and `undici`
// at the module level which poisons the Edge bundler even for paths never executed.
// Instead we inline the identical token-generation logic using Web Crypto API,
// which is available in both Vercel Edge Functions and modern browsers.
import { corsHeaders, handleOptions } from "../_lib/helpers.js";

export const config = { runtime: 'edge' };

/**
 * HMAC-SHA256 sign using Web Crypto subtle API (Edge / browser safe).
 * Replicates the signPayload() function from @vercel/blob/dist/client.js.
 */
async function hmacHex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Replicates generateClientTokenFromReadWriteToken() from @vercel/blob/client
 * without any Node.js built-ins.  Token format:
 *   vercel_blob_client_<storeId>_<base64(hmacHex.payloadBase64)>
 */
async function generateClientToken(opts: {
  token: string;
  pathname: string;
  allowedContentTypes?: string[];
  maximumSizeInBytes?: number;
  addRandomSuffix?: boolean;
}): Promise<string> {
  const { token, ...rest } = opts;
  // storeId is the 4th segment of the rw token: vercel_blob_rw_<storeId>_<secret>
  const parts = token.split("_");
  const storeId = parts[3] ?? null;
  if (!storeId) throw new Error("Invalid BLOB_READ_WRITE_TOKEN");

  const validUntil = Date.now() + 30_000; // 30 s from now
  const payload = btoa(JSON.stringify({ ...rest, validUntil }));
  const securedKey = await hmacHex(payload, token);

  // Combine as base64("<hmacHex>.<payloadBase64>")
  const combined = btoa(`${securedKey}.${payload}`);
  return `vercel_blob_client_${storeId}_${combined}`;
}

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

    const clientToken = await generateClientToken({
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
