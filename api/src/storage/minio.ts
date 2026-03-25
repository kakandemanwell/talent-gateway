import { Client as MinioClient } from "minio";
import type { Readable } from "stream";
import type { StorageProvider, FileInfo, PresignResult } from "./types.js";

const SIGNED_URL_TTL = 86400; // 24 hours — used only when STORAGE_PUBLIC_URL is not set

/**
 * Storage provider backed by a self-hosted MinIO instance (or any
 * MinIO-compatible S3-compatible service).
 *
 * Required env vars:
 *   MINIO_ENDPOINT          Hostname or IP of the MinIO server
 *   MINIO_ROOT_USER         Access key / username
 *   MINIO_ROOT_PASSWORD     Secret key / password
 *
 * Optional env vars:
 *   MINIO_PORT              Port (default: 9000)
 *   MINIO_USE_SSL           "true" to enable TLS (default: false)
 *   MINIO_BUCKET            Bucket name (default: "application-files")
 *   STORAGE_PUBLIC_URL      Portal public base URL — when set, file download
 *                           URLs point to the bearer-gated /functions/v1/files/
 *                           proxy instead of direct presigned MinIO URLs.
 */
export class MinioStorageProvider implements StorageProvider {
  private readonly client: MinioClient;
  private readonly bucket: string;
  private readonly publicUrl: string | null;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const port = parseInt(process.env.MINIO_PORT ?? "9000", 10);
    const useSSL = process.env.MINIO_USE_SSL === "true";
    const accessKey = process.env.MINIO_ROOT_USER;
    const secretKey = process.env.MINIO_ROOT_PASSWORD;

    this.bucket = process.env.MINIO_BUCKET ?? "application-files";
    this.publicUrl =
      process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "") ?? null;

    if (!endpoint || !accessKey || !secretKey) {
      throw new Error(
        "Missing MinIO env vars: MINIO_ENDPOINT, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD"
      );
    }

    this.client = new MinioClient({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      console.log(`[storage:minio] Created bucket: ${this.bucket}`);
    } else {
      console.log(`[storage:minio] Bucket already exists: ${this.bucket}`);
    }
  }

  async uploadFile(
    objectPath: string,
    data: Readable | Buffer,
    contentType: string,
    size?: number,
    originalFilename?: string
  ): Promise<string> {
    const metaData: Record<string, string> = { "Content-Type": contentType };
    if (originalFilename) {
      metaData["original-filename"] = originalFilename;
    }
    if (Buffer.isBuffer(data)) {
      await this.client.putObject(
        this.bucket,
        objectPath,
        data,
        data.length,
        metaData
      );
    } else {
      await this.client.putObject(
        this.bucket,
        objectPath,
        data,
        size ?? undefined,
        metaData
      );
    }
    return objectPath;
  }

  async presignFile(
    objectPath: string | null | undefined
  ): Promise<PresignResult | null> {
    if (!objectPath) return null;

    if (this.publicUrl) {
      const encodedPath = objectPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      return {
        signedUrl: `${this.publicUrl}/functions/v1/files/${encodedPath}`,
        expiresAt: null,
      };
    }

    try {
      const url = await this.client.presignedGetObject(
        this.bucket,
        objectPath,
        SIGNED_URL_TTL
      );
      return {
        signedUrl: url,
        expiresAt: new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString(),
      };
    } catch (err) {
      console.warn(`[storage:minio] Failed to presign ${objectPath}:`, err);
      return null;
    }
  }

  async statObject(objectPath: string): Promise<FileInfo> {
    const stat = await this.client.statObject(this.bucket, objectPath);
    return {
      contentType:
        (stat.metaData?.["content-type"] as string | undefined) ??
        "application/octet-stream",
      contentLength: stat.size > 0 ? stat.size : undefined,
      originalFilename:
        (stat.metaData?.["original-filename"] as string | undefined) ?? null,
    };
  }

  async getObject(objectPath: string): Promise<Readable> {
    return this.client.getObject(this.bucket, objectPath);
  }
}
