import type { FastifyPluginAsync } from "fastify";
import { statObject, getObject } from "../storage.js";
import { bearerAuth } from "../middleware/bearerAuth.js";

// ── File-proxy route ──────────────────────────────────────────────────────────
//
// GET /functions/v1/files/<objectPath...>
//
// Streams a file from MinIO back to the caller (e.g. Odoo) without the caller
// ever needing to reach MinIO directly. Bearer auth provides access control —
// no URL expiry to worry about.
//
// Response headers set:
//   Content-Type        — from MinIO object metadata
//   Content-Disposition — attachment; filename="..." (original filename preserved)
//   Content-Length      — from MinIO object stat (enables progress bars)
//   Cache-Control       — private, no-store (file is access-controlled)

const fileProxyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { "*": string } }>(
    "/functions/v1/files/*",
    { preHandler: bearerAuth },
    async (request, reply) => {
      const objectPath = request.params["*"];

      // Guard against empty or path-traversal attempts
      if (!objectPath || objectPath.includes("..")) {
        return reply.status(400).send({ error: "Invalid file path" });
      }

      // ── Stat the object — get size, content-type, original filename ───────
      let contentType = "application/octet-stream";
      let originalFilename: string | null = null;
      let contentLength: number | undefined;

      try {
        const info = await statObject(objectPath);
        contentType = info.contentType;
        originalFilename = info.originalFilename;
        contentLength = info.contentLength;
      } catch {
        return reply.status(404).send({ error: "File not found" });
      }

      // ── Derive a safe display filename ────────────────────────────────────
      // Fall back to the last segment of the object path if no metadata.
      const displayName =
        originalFilename ?? objectPath.split("/").pop() ?? "download";

      // RFC 6266: ASCII fallback + UTF-8 extended value
      const asciiName = displayName
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/["\\]/g, "_");
      const encodedName = encodeURIComponent(displayName);
      const contentDisposition =
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;

      reply.header("Content-Type", contentType);
      reply.header("Content-Disposition", contentDisposition);
      reply.header("Cache-Control", "private, no-store");
      if (contentLength !== undefined) {
        reply.header("Content-Length", contentLength);
      }

      // ── Stream from storage provider ──────────────────────────────────────
      let stream;
      try {
        stream = await getObject(objectPath);
      } catch {
        return reply.status(404).send({ error: "File not found" });
      }

      return reply.send(stream);
    }
  );
};

export default fileProxyRoutes;
