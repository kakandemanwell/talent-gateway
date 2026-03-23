import { Client as MinioClient } from "minio";
import { Readable } from "stream";

const BUCKET = "application-files";
const SIGNED_URL_TTL = 86400; // 24 hours — matches Supabase POC TTL

// When set, presigned URLs are rewritten to use this public base URL so that
// remote servers (e.g. Odoo on a different network) can actually reach the files.
// nginx proxies /application-files/ → minio:9000 and passes Host: minio:9000,
// so the HMAC presigned-URL signature remains valid.
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
 * Returns the stored object path (relative to bucket root).
 */
export async function uploadFile(
  objectPath: string,
  stream: Readable | Buffer,
  contentType: string,
  size?: number
): Promise<string> {
  const metaData = { "Content-Type": contentType };
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
 * Generate a presigned GET URL valid for 24 hours.
 * Returns the same shape as the Supabase edge function:
 *   { signedUrl: string; expiresAt: string }
 * Returns null if the path is empty or signing fails.
 */
export async function presignFile(
  objectPath: string | null | undefined
): Promise<{ signedUrl: string; expiresAt: string } | null> {
  if (!objectPath) return null;
  try {
    const internalUrl = await minio.presignedGetObject(
      BUCKET,
      objectPath,
      SIGNED_URL_TTL
    );
    // Rewrite internal MinIO host (e.g. http://minio:9000) to the public-facing
    // domain so that Odoo and other remote servers can download the file.
    const signedUrl = MINIO_PUBLIC_URL
      ? internalUrl.replace(/^https?:\/\/[^/]+/, MINIO_PUBLIC_URL)
      : internalUrl;
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();
    return { signedUrl, expiresAt };
  } catch (err) {
    console.warn(`[storage] Failed to presign ${objectPath}:`, err);
    return null;
  }
}
