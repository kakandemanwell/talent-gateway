import { corsHeaders, handleOptions } from "../_lib/helpers.js";

export const config = { runtime: "edge" };

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
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function generateClientToken(opts: {
  token: string;
  pathname: string;
  allowedContentTypes?: string[];
  maximumSizeInBytes?: number;
  addRandomSuffix?: boolean;
}): Promise<string> {
  const { token, ...rest } = opts;
  const parts = token.split("_");
  const storeId = parts[3] ?? null;

  if (!storeId) {
    throw new Error("Invalid BLOB_READ_WRITE_TOKEN");
  }

  const validUntil = Date.now() + 30 * 60 * 1000;
  const payload = btoa(JSON.stringify({ ...rest, validUntil }));
  const securedKey = await hmacHex(payload, token);
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
    const { pathname, contentType } = (await request.json()) as { pathname?: string; contentType?: string };
    if (!pathname) {
      return Response.json({ error: "pathname is required" }, { status: 422, headers: corsHeaders(request) });
    }

    const allowedContentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (contentType && !contentType.startsWith("text") && !allowedContentTypes.includes(contentType)) {
      allowedContentTypes.push(contentType);
    }

    const clientToken = await generateClientToken({
      token: rwToken,
      pathname,
      allowedContentTypes,
      maximumSizeInBytes: 10 * 1024 * 1024,
      addRandomSuffix: true,
    });

    return Response.json(
      {
        clientToken,
        strategy: "client-token",
      },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders(request) });
  }
}