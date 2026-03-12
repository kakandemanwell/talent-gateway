import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ensureBucket } from "./storage.js";
import odooJobsRoutes from "./routes/odooJobs.js";
import odooApplicationsRoutes from "./routes/odooApplications.js";
import publicJobsRoutes from "./routes/publicJobs.js";
import publicApplicationsRoutes from "./routes/publicApplications.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: ALLOWED_ORIGIN ?? false,
  methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["authorization", "content-type"],
});

// ── Multipart (file uploads) ──────────────────────────────────────────────────
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 20,                  // max files per request
    fields: 20,                 // max non-file fields
  },
});

// ── Global error handler ──────────────────────────────────────────────────────
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  const status = error.statusCode ?? 500;
  reply.status(status).send({ error: error.message ?? "Internal server error" });
});

// ── Healthcheck ───────────────────────────────────────────────────────────────
app.get("/health", async () => ({ status: "ok" }));

// ── Odoo gateway routes (exact paths preserved from Supabase edge functions) ──
await app.register(odooJobsRoutes);
await app.register(odooApplicationsRoutes);

// ── Public routes (frontend → API) ────────────────────────────────────────────
await app.register(publicJobsRoutes, { prefix: "/api" });
await app.register(publicApplicationsRoutes, { prefix: "/api" });

// ── Startup ───────────────────────────────────────────────────────────────────
try {
  // Ensure the MinIO bucket exists before accepting requests
  await ensureBucket();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`EPRC Jobs Portal API listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
