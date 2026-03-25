import { Client as MinioClient } from "minio";
import { Readable } from "stream";

export const BUCKET = "application-files";
const SIGNED_URL_TTL = 86400; // 24 hours — used only when no public URL is configured

// When set, file URLs returned to Odoo point to the portal's own file-proxy
// endpoint (/functions/v1/files/*) instead of directly to MinIO.
// The API streams the file from MinIO internally — Odoo never needs to reach
// MinIO across the network. Set to the portal's public HTTPS base URL.
// Example: https://jobs.eprc.example.com
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, "") || null;

const endpoint = process.env.MINIO_ENDPOINT;
const port = parseInt(process.env.MINIO_PORT ?? "9000", 10);
const useSSL = process.env.MINIO_USE_SSL === "true";
const accessKey = process.env.MINIO_ROOT_USER;
const secretKey = process.env.MINIO_ROOT_PASSWORD;

if (!endpoint || !accessKey || !secretKey) {
  throw new Error(
    "Missing MinIO environment variables: MINIO_ENDPOINT, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD"
  );
}

export const minio = new MinioClient({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

/**
 * Idempotent bucket setup — called once at API startup.
 * Creates the application-files bucket if it does not already exist.
 * Bucket stays PRIVATE — all access is via presigned URLs.
 */
export async function ensureBucket(): Promise<void> {
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) {
    await minio.makeBucket(BUCKET);
    console.log(`[storage] Created bucket: ${BUCKET}`);
  } else {
    console.log(`[storage] Bucket already exists: ${BUCKET}`);
  }
}

/**
 * Upload a readable stream (or Buffer) to MinIO.
 * Pass originalFilename to preserve the submitter's filename in the
 * file-proxy Content-Disposition header on download.
 * Returns the stored object path (relative to bucket root).
 */
export async function uploadFile(
  objectPath: string,
  stream: Readable | Buffer,
  contentType: string,
  size?: number,
  originalFilename?: string
): Promise<string> {
  const metaData: Record<string, string> = { "Content-Type": contentType };
  if (originalFilename) {
    metaData["original-filename"] = originalFilename;
  }
  if (Buffer.isBuffer(stream)) {
    await minio.putObject(BUCKET, objectPath, stream, stream.length, metaData);
  } else {
    await minio.putObject(
      BUCKET,
      objectPath,
      stream,
      size ?? undefined,
      metaData
    );
  }
  return objectPath;
}

/**
 * Return a URL for downloading a stored file.
 *
 * When MINIO_PUBLIC_URL is set (production/staging):
 *   Returns a portal file-proxy URL: {PUBLIC_URL}/functions/v1/files/{objectPath}
 *   The API streams the file from MinIO internally — the caller never reaches
 *   MinIO directly. No expiry; bearer auth on the proxy endpoint is the gate.
 *
 * When MINIO_PUBLIC_URL is not set (local dev):
 *   Falls back to a direct MinIO presigned URL valid for 24 hours.
 *
 * Returns the same shape as the old presignFile helper so all call-sites are
 * unchanged. expiresAt is null for proxy URLs (they don't expire).
 */
export async function presignFile(
  objectPath: string | null | undefined
): Promise<{ signedUrl: string; expiresAt: string | null } | null> {
  if (!objectPath) return null;

  if (MINIO_PUBLIC_URL) {
    // Encode each path segment (handles spaces/special chars) but keep "/" as
    // path separators so Fastify routes the wildcard correctly.
    const encodedPath = objectPath
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return {
      signedUrl: `${MINIO_PUBLIC_URL}/functions/v1/files/${encodedPath}`,
      expiresAt: null,
    };
  }

  // Local dev fallback — direct MinIO presigned URL
  try {
    const url = await minio.presignedGetObject(BUCKET, objectPath, SIGNED_URL_TTL);
    return {
      signedUrl: url,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString(),
    };
  } catch (err) {
    console.warn(`[storage] Failed to presign ${objectPath}:`, err);
    return null;
  }
}
