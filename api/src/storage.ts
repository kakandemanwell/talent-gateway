// ── Storage provider factory ──────────────────────────────────────────────────
//
// This module selects the active storage backend at startup via the
// STORAGE_PROVIDER environment variable and re-exports a stable set of
// standalone functions so that all callers (routes, index.ts) are unchanged.
//
// STORAGE_PROVIDER=minio         (default) → MinioStorageProvider
// STORAGE_PROVIDER=s3                       → S3StorageProvider (AWS S3, Cloudflare R2, …)
// STORAGE_PROVIDER=vercel-blob              → VercelBlobStorageProvider
//
// See api/src/storage/{minio,s3,vercel-blob}.ts for required env vars per provider.

import type { StorageProvider } from "./storage/types.js";
import { MinioStorageProvider } from "./storage/minio.js";
import { S3StorageProvider } from "./storage/s3.js";
import { VercelBlobStorageProvider } from "./storage/vercel-blob.js";

export type { FileInfo, PresignResult } from "./storage/types.js";

const providerName = (process.env.STORAGE_PROVIDER ?? "minio").toLowerCase();

let _provider: StorageProvider;

if (providerName === "s3") {
  _provider = new S3StorageProvider();
} else if (providerName === "vercel-blob") {
  _provider = new VercelBlobStorageProvider();
} else {
  _provider = new MinioStorageProvider();
}

// ── Standalone function exports ───────────────────────────────────────────────
// These thin wrappers delegate to the active provider and keep all existing
// call-sites (index.ts, routes/*) unchanged.

export function ensureBucket(): Promise<void> {
  return _provider.ensureBucket();
}

export function uploadFile(
  objectPath: string,
  data: import("stream").Readable | Buffer,
  contentType: string,
  size?: number,
  originalFilename?: string
): Promise<string> {
  return _provider.uploadFile(objectPath, data, contentType, size, originalFilename);
}

export function presignFile(
  objectPath: string | null | undefined
): Promise<{ signedUrl: string; expiresAt: string | null } | null> {
  return _provider.presignFile(objectPath);
}

export function statObject(
  objectPath: string
): Promise<import("./storage/types.js").FileInfo> {
  return _provider.statObject(objectPath);
}

export function getObject(
  objectPath: string
): Promise<import("stream").Readable> {
  return _provider.getObject(objectPath);
}
