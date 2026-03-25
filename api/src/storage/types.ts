import type { Readable } from "stream";

// ── Shared return types ───────────────────────────────────────────────────────

export interface FileInfo {
  contentType: string;
  contentLength: number | undefined;
  originalFilename: string | null;
}

export interface PresignResult {
  signedUrl: string;
  expiresAt: string | null;
}

// ── Storage provider interface ────────────────────────────────────────────────
//
// Any storage backend must implement this interface.
// Current implementations: MinioStorageProvider, S3StorageProvider
//
// Switching backend = set STORAGE_PROVIDER env var:
//   "minio"  — self-hosted MinIO (default)
//   "s3"     — AWS S3, Cloudflare R2, or any S3-compatible service

export interface StorageProvider {
  /**
   * Idempotent bucket/container setup.
   * Called once at API startup — safe to call if bucket already exists.
   */
  ensureBucket(): Promise<void>;

  /**
   * Upload a file (stream or in-memory Buffer) to the bucket.
   * @param objectPath  Relative path inside the bucket, e.g. "{uuid}/cv/file.pdf"
   * @param data        File content as Readable or Buffer
   * @param contentType MIME type
   * @param size        Byte length (optional, recommended for streams)
   * @param originalFilename  Preserved in metadata for Content-Disposition on download
   * @returns           The stored objectPath (unchanged)
   */
  uploadFile(
    objectPath: string,
    data: Readable | Buffer,
    contentType: string,
    size?: number,
    originalFilename?: string
  ): Promise<string>;

  /**
   * Return a URL for downloading a file.
   *
   * When STORAGE_PUBLIC_URL is set (production):
   *   Returns a portal file-proxy URL. No expiry; bearer auth is the gate.
   *
   * When STORAGE_PUBLIC_URL is not set (local dev):
   *   Returns a direct presigned URL valid for 24 h.
   *
   * Returns null if objectPath is null/undefined/empty.
   */
  presignFile(
    objectPath: string | null | undefined
  ): Promise<PresignResult | null>;

  /**
   * Fetch metadata about a stored object (content-type, size, original filename).
   * Throws if the object does not exist.
   */
  statObject(objectPath: string): Promise<FileInfo>;

  /**
   * Stream a stored object's raw bytes.
   * Throws if the object does not exist.
   */
  getObject(objectPath: string): Promise<Readable>;
}
