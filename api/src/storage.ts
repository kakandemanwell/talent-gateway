import { Client as MinioClient } from "minio";

const BUCKET = "application-files";
const SIGNED_URL_TTL = 86400; // 24 hours — matches Supabase POC TTL

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
  stream: NodeJS.ReadableStream | Buffer,
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
    const signedUrl = await minio.presignedGetObject(
      BUCKET,
      objectPath,
      SIGNED_URL_TTL
    );
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();
    return { signedUrl, expiresAt };
  } catch (err) {
    console.warn(`[storage] Failed to presign ${objectPath}:`, err);
    return null;
  }
}
