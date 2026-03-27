import { get as getBlob } from "@vercel/blob";
import sql from "../../_lib/db.js";
import { bearerAuth } from "../../_lib/auth.js";
import { getBlobStoreAccess } from "../../_lib/storage.js";

export const config = { runtime: "nodejs" };

function extractFileSegments(pathname: string): string[] {
  const pathAfterFiles = pathname.replace(/.*\/files\//, "");
  return pathAfterFiles.split("/").filter(Boolean);
}

export async function handleOdooFileRequest(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const url = new URL(request.url);
  const segments = extractFileSegments(url.pathname);

  if (segments.length < 2) {
    return Response.json({ error: "Invalid file path" }, { status: 400 });
  }

  if (segments.some((segment) => segment === "..")) {
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