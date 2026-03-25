import { put, head } from "@vercel/blob";
import { Readable } from "stream";
import type { StorageProvider, FileInfo, PresignResult } from "./types.js";

/**
 * Storage provider backed by Vercel Blob.
 *
 * Files are uploaded with `access: "public"` so they are directly
 * accessible via Vercel's global CDN — no expiry, no signed URLs needed.
 * Odoo (and any other caller) downloads files via the public CDN URL that
 * is stored in `cv_file_path` / `accolade_file_path` in the database.
 *
 * When `STORAGE_PUBLIC_URL` is set the file-proxy pattern is still available
 * (bearer-gated `/functions/v1/files/*`) for backward compatibility with
 * Odoo integrations that expect that route. The proxy encodes the blob URL
 * into the request path and this provider reconstructs it on `statObject` /
 * `getObject` calls.
 *
 * Required env vars:
 *   BLOB_READ_WRITE_TOKEN   Vercel Blob read-write token
 *
 * Optional env vars:
 *   STORAGE_PUBLIC_URL      Portal public base URL — when set, download URLs
 *                           returned to Odoo route through the bearer-gated
 *                           file-proxy instead of the direct CDN URL.
 */
export class VercelBlobStorageProvider implements StorageProvider {
  private readonly token: string;
  private readonly publicUrl: string | null;

  constructor() {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("Missing env var: BLOB_READ_WRITE_TOKEN");
    }
    this.token = token;
    this.publicUrl =
      process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "") ?? null;
  }

  async ensureBucket(): Promise<void> {
    // Vercel Blob has no bucket/container concept — no-op.
    console.log("[storage:vercel-blob] Ready (no bucket setup required)");
  }

  async uploadFile(
    objectPath: string,
    data: Readable | Buffer,
    contentType: string,
    _size?: number,
    originalFilename?: string
  ): Promise<string> {
    const result = await put(objectPath, data, {
      access: "public",
      // Deterministic URL — no random suffix so the path is stable and
      // can be reconstructed from the stored URL later.
      addRandomSuffix: false,
      contentType,
      token: this.token,
      ...(originalFilename
        ? {
            // Preserve original filename in Content-Disposition for downloads.
            contentDisposition: `attachment; filename="${originalFilename.replace(/"/g, '\\"')}"`,
          }
        : {}),
    });

    // Return the full blob URL — callers store this in the database.
    // statObject / getObject accept the URL directly.
    return result.url;
  }

  async presignFile(
    objectPathOrUrl: string | null | undefined
  ): Promise<PresignResult | null> {
    if (!objectPathOrUrl) return null;

    // ── URL stored in DB (current Vercel Blob uploads) ────────────────────
    if (objectPathOrUrl.startsWith("http")) {
      if (this.publicUrl) {
        // Route through the file proxy for Odoo bearer-auth compatibility.
        // The proxy path encodes the full blob URL so the proxy can fetch it.
        const encoded = encodeURIComponent(objectPathOrUrl);
        return {
          signedUrl: `${this.publicUrl}/functions/v1/files/${encoded}`,
          expiresAt: null,
        };
      }
      // No proxy configured — return the CDN URL directly (no expiry).
      return { signedUrl: objectPathOrUrl, expiresAt: null };
    }

    // ── Legacy relative path (MinIO/S3 data before migration) ─────────────
    if (this.publicUrl) {
      const encodedPath = objectPathOrUrl
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      return {
        signedUrl: `${this.publicUrl}/functions/v1/files/${encodedPath}`,
        expiresAt: null,
      };
    }
    return { signedUrl: objectPathOrUrl, expiresAt: null };
  }

  async statObject(objectPathOrUrl: string): Promise<FileInfo> {
    // Resolve to a fetchable URL.
    const url = this._resolveUrl(objectPathOrUrl);

    const info = await head(url, { token: this.token });

    // Extract original filename from Content-Disposition metadata.
    let originalFilename: string | null = null;
    if (info.contentDisposition) {
      const match = info.contentDisposition.match(/filename="([^"]+)"/);
      if (match) originalFilename = decodeURIComponent(match[1]);
    }

    return {
      contentType: info.contentType ?? "application/octet-stream",
      contentLength: info.size > 0 ? info.size : undefined,
      originalFilename,
    };
  }

  async getObject(objectPathOrUrl: string): Promise<Readable> {
    const url = this._resolveUrl(objectPathOrUrl);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[storage:vercel-blob] Fetch failed (${response.status}) for: ${url}`
      );
    }
    if (!response.body) {
      throw new Error(
        `[storage:vercel-blob] Empty response body for: ${url}`
      );
    }

    // Convert the WHATWG ReadableStream to a Node.js Readable.
    return Readable.fromWeb(
      response.body as Parameters<typeof Readable.fromWeb>[0]
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * The fileProxy route calls statObject/getObject with the path portion of
   * the proxy URL (params["*"]).  When Vercel Blob is in use that segment is
   * the percent-encoded full blob URL.  Decode it back to a URL here; if it
   * is already a URL leave it as-is; otherwise treat it as a public path.
   */
  private _resolveUrl(pathOrUrl: string): string {
    try {
      // If fileProxy encoded a full URL, single decodeURIComponent unwraps it.
      const decoded = decodeURIComponent(pathOrUrl);
      if (decoded.startsWith("http")) return decoded;
    } catch {
      // decoding failed — fall through
    }
    if (pathOrUrl.startsWith("http")) return pathOrUrl;
    // Fallback: construct URL from path using blob store base URL so legacy
    // MinIO paths still resolve if the store has them (post-migration).
    const base = process.env.BLOB_STORE_BASE_URL?.replace(/\/$/, "");
    if (base) return `${base}/${pathOrUrl}`;
    throw new Error(
      `[storage:vercel-blob] Cannot resolve object "${pathOrUrl}" to a URL. ` +
        "Set BLOB_STORE_BASE_URL for legacy path-based lookups."
    );
  }
}
