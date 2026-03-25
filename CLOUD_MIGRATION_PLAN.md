# EPRC Jobs Portal — Cloud Migration Plan
## `feat/docker-self-hosted` → `feat/cloud-portable`

---

## What Changed

The self-hosted stack required Docker with MinIO (object storage) and PostgreSQL
running on the same server. This branch removes those hard dependencies by
abstracting both services behind swappable interfaces, making it possible to run
the same codebase against cloud-managed services — no Docker required.

| Component | Before | After (this branch) |
|---|---|---|
| Object storage | Self-hosted MinIO in Docker | MinIO **or** S3-compatible **or** Vercel Blob |
| Database | Self-hosted PostgreSQL in Docker | Self-hosted **or** Neon **or** any PostgreSQL |
| Frontend hosting | nginx in Docker | any static host (Vercel, Netlify, …) |
| API hosting | Docker container | any Node.js host (Railway, Render, Fly.io, …) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser / Odoo                                         │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐    ┌────────────────────────┐
    │   Frontend SPA      │    │   Fastify API          │
    │   (Vercel /         │───▶│   (Railway / Render /  │
    │    Netlify / nginx) │    │    Fly.io / Docker)    │
    └─────────────────────┘    └──────┬─────────┬───────┘
                                      │         │
                         ┌────────────▼─┐  ┌────▼───────────────┐
                         │  PostgreSQL  │  │  Object Storage     │
                         │  (Neon /     │  │  (Vercel Blob /     │
                         │   self-host) │  │   Cloudflare R2 /   │
                         └─────────────┘  │   AWS S3 / MinIO)   │
                                          └─────────────────────┘
```

---

## Storage Provider Reference

Select a provider by setting `STORAGE_PROVIDER` in the API's environment.

### `vercel-blob` — Vercel Blob (recommended for Vercel deployments)

```
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

- Files are stored with `access: "public"` on Vercel's global CDN.
- `cv_file_path` / `accolade_file_path` in the database store the full CDN URL
  returned by `@vercel/blob put()`.
- Odoo downloads files directly from the CDN URL — no file proxy needed.
- If `STORAGE_PUBLIC_URL` is set, Odoo file URLs are routed through the
  bearer-gated `/functions/v1/files/*` proxy instead (for stricter access control).

### `s3` — S3-compatible (Cloudflare R2, AWS S3, Backblaze B2, …)

```
STORAGE_PROVIDER=s3
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto           # "auto" for R2; AWS region name otherwise
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com   # R2, B2, etc.
S3_BUCKET=application-files
STORAGE_PUBLIC_URL=https://jobs.eprc.example.com
```

- Files stored with private ACL; served via the `/functions/v1/files/*` proxy.
- `STORAGE_PUBLIC_URL` **required** in production (so Odoo can reach the proxy).

### `minio` — Self-hosted MinIO (default, Docker branch behaviour)

```
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=...
STORAGE_PUBLIC_URL=http://<server_ip>
```

---

## Database Reference

`postgres.js` reads `DATABASE_URL` directly. No code changes are needed between
providers — just swap the connection string.

### Neon

```
DATABASE_URL=postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require
```

Use the **pooled** endpoint (PgBouncer) for the API in production.
Use the **unpooled** endpoint when running schema migrations.

### Self-hosted PostgreSQL

```
DATABASE_URL=postgres://gateway:<password>@<host>:5432/recruitment
```

---

## Step-by-Step: Deploy to Vercel Blob + Neon

### Prerequisites

- Neon project created — copy the **pooled** `DATABASE_URL`.
- Vercel project created — add Vercel Blob storage and copy `BLOB_READ_WRITE_TOKEN`.
- DNS-pointed domain (e.g. `jobs.eprc.example.com`) for the portal.
- A Node.js host for the API (Railway, Render, or Fly.io). Free tiers exist on all three.

---

### Step 1 — Apply the database schema to Neon

Use the **unpooled** connection string here (PgBouncer doesn't support DDL):

```bash
psql "postgresql://neondb_owner:<pw>@<unpooled-host>/neondb?sslmode=require" \
  -f docker/postgres/init.sql
```

Or paste the SQL into the Neon SQL editor in the dashboard.

---

### Step 2 — Configure the API environment

On Railway / Render / Fly.io, set these environment variables for the API service:

```dotenv
# Storage
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_4DscvcqAyAwtrDia_...

# Database (Neon pooled)
DATABASE_URL=postgresql://neondb_owner:<pw>@<pooler-host>/neondb?sslmode=require

# API access control
ODOO_API_KEY=<generate 40-char random hex>
ALLOWED_ORIGIN=https://jobs.eprc.example.com
STORAGE_PUBLIC_URL=https://jobs.eprc.example.com   # your portal domain
```

Deploy with:
```bash
# From talent-gateway/api/
npm install
npm run build
npm start
```

The API will be available at e.g. `https://eprc-api.railway.app`.

---

### Step 3 — Deploy the frontend to Vercel

1. Push the `feat/cloud-portable` branch to GitHub.
2. Import the repo in Vercel → set **Root Directory** to `talent-gateway`.
3. Vercel auto-detects Vite. Set the environment variable:
   ```
   VITE_API_URL=https://eprc-api.railway.app/api
   ```
4. Deploy. Vercel uses `vercel.json` (already in the repo) for SPA routing.

---

### Step 4 — Update the Odoo module

In Odoo → Settings → EPRC Recruitment module, update the Gateway URL from the
old server IP to the new API host:

```
https://eprc-api.railway.app
```

The API key (`ODOO_API_KEY`) and all `/functions/v1/...` route paths are
**unchanged** — only the hostname changes.

---

## Migrating Existing Files from MinIO to Vercel Blob

If the self-hosted instance already has applicant files in MinIO, run the
migration script below **once** to copy objects and update the database.

```bash
# One-time migration: MinIO → Vercel Blob
# Run from a machine with access to both the MinIO instance and Neon.

node - <<'EOF'
import { Client as Minio } from 'minio';
import { put } from '@vercel/blob';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);
const minio = new Minio({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000, useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

// Migrate cv_file_path
const apps = await sql`SELECT id, cv_file_path FROM applications WHERE cv_file_path IS NOT NULL AND cv_file_path NOT LIKE 'http%'`;
for (const app of apps) {
  const stream = await minio.getObject('application-files', app.cv_file_path);
  const result = await put(app.cv_file_path, stream, {
    access: 'public', addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  await sql`UPDATE applications SET cv_file_path = ${result.url} WHERE id = ${app.id}`;
  console.log(`migrated cv: ${app.cv_file_path} → ${result.url}`);
}

// Migrate accolade_file_path
const edus = await sql`SELECT id, accolade_file_path FROM education WHERE accolade_file_path IS NOT NULL AND accolade_file_path NOT LIKE 'http%'`;
for (const edu of edus) {
  const stream = await minio.getObject('application-files', edu.accolade_file_path);
  const result = await put(edu.accolade_file_path, stream, {
    access: 'public', addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  await sql`UPDATE education SET accolade_file_path = ${result.url} WHERE id = ${edu.id}`;
  console.log(`migrated accolade: ${edu.accolade_file_path} → ${result.url}`);
}

await sql.end();
console.log('Migration complete.');
EOF
```

After migration, all `cv_file_path` and `accolade_file_path` values in the
database will be full Vercel Blob CDN URLs instead of relative MinIO paths.

---

## File Layout (new files in this branch)

```
api/
  package.json                     ← added @vercel/blob, @aws-sdk/*
  src/
    storage.ts                     ← factory; selects provider from STORAGE_PROVIDER
    storage/
      types.ts                     ← StorageProvider interface + shared types
      minio.ts                     ← MinioStorageProvider  (self-hosted)
      s3.ts                        ← S3StorageProvider    (AWS S3, R2, B2, …)
      vercel-blob.ts               ← VercelBlobStorageProvider
    routes/
      fileProxy.ts                 ← now uses statObject/getObject from factory
vercel.json                        ← Vercel frontend deployment config
.env.example                       ← updated with all provider env vars
```

---

## Quick Reference — Environment Variables

| Variable | Required for | Description |
|---|---|---|
| `DATABASE_URL` | All | PostgreSQL connection string |
| `STORAGE_PROVIDER` | All | `minio` / `s3` / `vercel-blob` |
| `STORAGE_PUBLIC_URL` | Production | Portal HTTPS URL for file proxy |
| `BLOB_READ_WRITE_TOKEN` | vercel-blob | Vercel Blob read-write token |
| `BLOB_STORE_BASE_URL` | vercel-blob (migration) | Blob store base URL for legacy paths |
| `MINIO_ENDPOINT` | minio | MinIO hostname |
| `MINIO_ROOT_USER` | minio | MinIO access key |
| `MINIO_ROOT_PASSWORD` | minio | MinIO secret key |
| `MINIO_PORT` | minio | Port (default 9000) |
| `MINIO_USE_SSL` | minio | `true` for TLS (default false) |
| `S3_ACCESS_KEY_ID` | s3 | S3 access key |
| `S3_SECRET_ACCESS_KEY` | s3 | S3 secret key |
| `S3_REGION` | s3 | AWS region or `auto` for R2 |
| `S3_ENDPOINT` | s3 (non-AWS) | Custom endpoint URL |
| `S3_BUCKET` | s3 | Bucket name (default `application-files`) |
| `ODOO_API_KEY` | All | Bearer token for Odoo-facing routes |
| `ALLOWED_ORIGIN` | All | CORS origin for the public API |
| `VITE_API_URL` | Frontend build | API base URL seen by the browser |
