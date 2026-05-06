import { put } from "@vercel/blob";
import { corsHeaders, handleOptions } from "./_lib/helpers.js";

export const config = { runtime: "nodejs" };

// POST /api/storage?action=upload
// GET /api/storage?action=upload-url
async function handleUpload(request: Request): Promise<Response> {
  const rwToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!rwToken) {
    return Response.json(
      { error: "Blob storage not configured" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data body" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const file = formData.get("file") as File | null;
  const pathname = formData.get("pathname") as string | null;

  if (!file || !pathname) {
    return Response.json(
      { error: "file and pathname are required" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const normalizedPathname = pathname.replace(/^\/+/, "").replace(/\/$/, "");

  try {
    const { url } = await put(normalizedPathname, file, {
      access: "public",
      token: rwToken,
    });

    return Response.json({ url }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Upload failed" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

// GET /api/storage?action=upload-url
async function handleUploadUrl(request: Request): Promise<Response> {
  const rwToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!rwToken) {
    return Response.json(
      { error: "Blob storage not configured" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  // Generate a basic upload URL for client-side uploads
  // In production, use proper signed URLs
  const uploadPath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return Response.json(
    {
      uploadUrl: `/api/storage?action=upload`,
      pathname: uploadPath,
    },
    { headers: corsHeaders(request) }
  );
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "upload";

  if (request.method === "POST" && action === "upload") {
    return await handleUpload(request);
  }

  if (request.method === "GET" && action === "upload-url") {
    return await handleUploadUrl(request);
  }

  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: corsHeaders(request) }
  );
}
