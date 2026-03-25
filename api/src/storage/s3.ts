import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";
import type { StorageProvider, FileInfo, PresignResult } from "./types.js";

const SIGNED_URL_TTL = 86400; // 24 hours — used only when STORAGE_PUBLIC_URL is not set

/**
 * Storage provider backed by any S3-compatible object storage service:
 *   - AWS S3              (no S3_ENDPOINT needed)
 *   - Cloudflare R2       (S3_ENDPOINT = https://{account_id}.r2.cloudflarestorage.com)
 *   - Backblaze B2        (S3_ENDPOINT = https://s3.{region}.backblazeb2.com)
 *   - Tigris, Fly.io Tigris, Wasabi, etc.
 *
 * Required env vars:
 *   S3_ACCESS_KEY_ID      Access key
 *   S3_SECRET_ACCESS_KEY  Secret key
 *
 * Optional env vars:
 *   S3_BUCKET             Bucket name (default: "application-files")
 *   S3_REGION             AWS region or "auto" for R2 (default: "us-east-1")
 *   S3_ENDPOINT           Custom endpoint URL — required for non-AWS services
 *   S3_FORCE_PATH_STYLE   "true" to use path-style URLs (older S3-compatible
 *                         services; not needed for AWS S3 or Cloudflare R2)
 *   STORAGE_PUBLIC_URL    Portal public base URL — when set, file download
 *                         URLs point to the bearer-gated /functions/v1/files/
 *                         proxy instead of direct presigned object URLs.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string | null;

  constructor() {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing S3 env vars: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
      );
    }

    this.bucket = process.env.S3_BUCKET ?? "application-files";
    this.publicUrl =
      process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "") ?? null;

    const region = process.env.S3_REGION ?? "us-east-1";
    const endpoint = process.env.S3_ENDPOINT;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint } : {}),
      ...(forcePathStyle ? { forcePathStyle: true } : {}),
    });
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.bucket })
      );
      console.log(`[storage:s3] Bucket exists: ${this.bucket}`);
    } catch (err: unknown) {
      const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (httpStatus === 404 || httpStatus === 301) {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket })
        );
        console.log(`[storage:s3] Created bucket: ${this.bucket}`);
      } else {
        // Bucket already exists in another account, or access denied — surface error
        throw err;
      }
    }
  }

  async uploadFile(
    objectPath: string,
    data: Readable | Buffer,
    contentType: string,
    _size?: number,
    originalFilename?: string
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectPath,
        Body: data,
        ContentType: contentType,
        ...(originalFilename
          ? { Metadata: { "original-filename": originalFilename } }
          : {}),
      })
    );
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
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: objectPath }),
        { expiresIn: SIGNED_URL_TTL }
      );
      return {
        signedUrl: url,
        expiresAt: new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString(),
      };
    } catch (err) {
      console.warn(`[storage:s3] Failed to presign ${objectPath}:`, err);
      return null;
    }
  }

  async statObject(objectPath: string): Promise<FileInfo> {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: objectPath })
    );
    return {
      contentType: result.ContentType ?? "application/octet-stream",
      // AWS SDK v3 returns ContentLength as bigint in some versions; coerce safely
      contentLength:
        result.ContentLength != null
          ? Number(result.ContentLength)
          : undefined,
      originalFilename: result.Metadata?.["original-filename"] ?? null,
    };
  }

  async getObject(objectPath: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectPath })
    );
    if (!result.Body) {
      throw new Error(
        `[storage:s3] Empty body returned for object: ${objectPath}`
      );
    }
    // On Node.js, @aws-sdk/client-s3 Body is a web ReadableStream wrapped in
    // a Node.js Readable via SdkStreamMixin — the cast is safe.
    return result.Body as unknown as Readable;
  }
}
