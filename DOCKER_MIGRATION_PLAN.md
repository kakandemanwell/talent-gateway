# Migration Plan: Supabase POC → Self-Hosted Docker Stack (PostgreSQL + MinIO)

**Branch:** `feat/docker-self-hosted`
**Repo directory:** `eprc-jobs-portal/` _(renamed from `talent-gateway/`)_
**Status:** In progress

---

## Current Architecture (Supabase POC)

| Concern | Supabase component |
|---|---|
| Relational data | Supabase-managed PostgreSQL |
| File storage | Supabase Storage bucket `application-files` |
| Odoo API gateway | 4 Supabase Edge Functions (Deno) |
| Frontend SDK | `@supabase/supabase-js` (direct DB + storage calls) |
| Public read access | PostgreSQL RLS on `jobs` table |
| Odoo auth | `Bearer {ODOO_API_KEY}` on edge functions |
| Signed URLs | Supabase Storage `.createSignedUrl()` (24 h TTL) |

---

## Target Architecture (Docker)

```
┌───────────────────────────────────────────────────────────┐
│  Docker Compose — single host                             │
│                                                           │
│  ┌─────────────┐   ┌───────────────────────────────────┐ │
│  │   nginx     │──▶│  frontend  (Nginx + Vite build)   │ │
│  │  :443/:80   │   └───────────────────────────────────┘ │
│  │  (reverse   │                                          │
│  │   proxy)    │──▶┌───────────────────────────────────┐ │
│  └─────────────┘   │  api  (Node.js / Fastify) :3000   │ │
│                    │  - public job + application routes │ │
│                    │  - Odoo gateway routes            │ │
│                    └───────────┬───────────────────────┘ │
│                                │                          │
│                    ┌───────────▼──────────┐               │
│                    │  postgres:5432       │               │
│                    │  (PostgreSQL 16)     │               │
│                    └──────────────────────┘               │
│                    ┌──────────────────────┐               │
│                    │  minio:9000          │               │
│                    │  (MinIO — S3 compat) │               │
│                    │  console :9001       │               │
│                    └──────────────────────┘               │
└───────────────────────────────────────────────────────────┘
```

---

## Repository Structure (additions on the new branch)

```
recruitment/
  DOCKER_MIGRATION_PLAN.md        ← this file
  docker-compose.yml
  .env.example
  docker/
    nginx/
      nginx.conf                  # reverse proxy + TLS config
    postgres/
      init.sql                    # schema (adapted from migration_full.sql)
  api/                            # NEW: Node.js API service
    Dockerfile
    package.json
    tsconfig.json
    src/
      index.ts                    # Fastify app entry
      db.ts                       # postgres.js pool
      storage.ts                  # MinIO SDK client + presign helper
      routes/
        publicJobs.ts             # GET /api/jobs, GET /api/jobs/:id
        publicApplications.ts    # POST /api/applications (multipart)
        odooJobs.ts              # GET+HEAD /functions/v1/odoo-get-jobs
                                 # POST     /functions/v1/odoo-push-job
        odooApplications.ts      # GET  /functions/v1/odoo-get-applications
                                 # PATCH /functions/v1/odoo-patch-application
      middleware/
        bearerAuth.ts            # validates ODOO_API_KEY
        cors.ts
  eprc-jobs-portal/               # renamed from talent-gateway/
    src/
      lib/
        api.ts                   # replaces supabase.ts
        jobService.ts            # fetch() replaces supabase client calls
        applicationService.ts    # FormData POST replaces supabase SDK
    Dockerfile                   # Vite build → nginx static
```

---

## Phase 0 — Git Setup

```bash
git checkout main
git pull origin main
git checkout -b feat/docker-self-hosted
```

---

## Phase 1 — PostgreSQL Service

### docker-compose.yml (postgres service)

```yaml
postgres:
  image: postgres:16-alpine
  restart: unless-stopped
  environment:
    POSTGRES_DB:       ${POSTGRES_DB}
    POSTGRES_USER:     ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/01_init.sql:ro
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### docker/postgres/init.sql

Adapted directly from `talent-gateway/supabase/migration_full.sql`.

**Lines to keep (unchanged):**
- `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
- All `CREATE TABLE` statements (`jobs`, `applications`, `experience`, `education`)
- All `CREATE INDEX` statements
- `update_updated_at()` function + both triggers

**Lines to remove (Supabase-specific):**
- `INSERT INTO storage.buckets ...`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- All `CREATE POLICY` statements

**Why RLS is safe to drop:**
The database is on an internal Docker network with no public port exposed. Access control moves entirely to the API layer — see Phase 4 for the mapping.

| RLS rule that existed | API-layer replacement |
|---|---|
| Anon sees only `is_active=true AND closing_date >= today` | Hard-coded WHERE clause in `publicJobs.ts` |
| Service role bypasses RLS (edge functions) | API connects with full credentials; Odoo routes are behind `bearerAuth` |
| Anon cannot INSERT/UPDATE jobs | No public mutation route for `jobs` exists |
| Anon cannot SELECT applications | No public SELECT applications route exists |

---

## Phase 2 — MinIO Service

### docker-compose.yml (minio service)

```yaml
minio:
  image: minio/minio:latest
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER:     ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 10s
    timeout: 5s
    retries: 5
```

MinIO port `:9000` (data) is **not published** to the host — only the `api` container reaches it on the internal network. The admin console (`:9001`) may be published with IP restriction.

### Bucket initialisation (api startup, idempotent)

```ts
// api/src/storage.ts
await minioClient.makeBucket("application-files").catch((e) => {
  if (e.code !== "BucketAlreadyOwnedByYou") throw e;
});
// bucket stays PRIVATE — all access is via presigned URLs
```

### Presigned URL mapping

| Supabase | MinIO replacement |
|---|---|
| `supabase.storage.from(BUCKET).createSignedUrl(path, 86400)` | `minioClient.presignedGetObject("application-files", path, 86400)` |
| Returns `{ signedUrl, expiresAt }` | `presignHelper()` in `storage.ts` returns the same shape |
| 24 h TTL | 24 h TTL — unchanged (Odoo cron needs a full day to download) |

---

## Phase 3 — API Service (Node.js / Fastify)

### Technology

| Choice | Reasoning |
|---|---|
| Node.js 20 LTS | Standard Docker image, no Deno runtime needed |
| Fastify | Typed, fast, mature multipart plugin |
| `postgres` (porsager) | Lightweight, prepared statements by default, no ORM weight |
| `minio` (official JS SDK) | Direct S3-compatible presign support |
| `@fastify/multipart` | Streams file uploads — no full file buffering in memory |

### Odoo-facing routes — URL contract preserved exactly

The Supabase edge function paths that Odoo is configured to call **do not change**. Only the host/domain changes in Odoo settings.

| Method | Path | Edge Function replaced | Auth |
|---|---|---|---|
| `GET` + `HEAD` | `/functions/v1/odoo-get-jobs` | `odoo-get-jobs` | Bearer |
| `POST` | `/functions/v1/odoo-push-job` | `odoo-push-job` | Bearer |
| `GET` | `/functions/v1/odoo-get-applications` | `odoo-get-applications` | Bearer |
| `PATCH` | `/functions/v1/odoo-patch-application` | `odoo-patch-application` | Bearer |

### Public routes (frontend → API, replaces Supabase SDK calls)

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/api/jobs` | `supabase.from('jobs').select(...)` |
| `GET` | `/api/jobs/:id` | `supabase.from('jobs').select(...).eq('id', id)` |
| `POST` | `/api/applications` (multipart/form-data) | `supabase.from('applications').insert(...)` + `supabase.storage.upload(...)` |

### bearerAuth middleware (identical logic to edge functions)

```ts
// api/src/middleware/bearerAuth.ts
export async function bearerAuth(request, reply) {
  const expectedKey = process.env.ODOO_API_KEY;
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token || token !== expectedKey) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
```

### CORS

`ALLOWED_ORIGIN` env var → Fastify CORS plugin. Same as the edge functions.

### Application submission flow (replaces `applicationService.ts` logic)

The `POST /api/applications` multipart endpoint replicates the exact 5-step transactional flow:

1. Parse multipart fields and files from request stream.
2. INSERT `applications` row → get UUID.
3. Stream CV file → upload to MinIO at `{uuid}/cv/{timestamp}.{ext}`.
4. UPDATE `applications.cv_file_path` = stored path.
5. Stream any accolade files → upload to MinIO at `{uuid}/accolades/{timestamp}_{random}.{ext}`.
6. INSERT `experience` rows.
7. INSERT `education` rows (with accolade paths).
8. On any failure: UPDATE `applications.status = 'submission_failed'` (same rollback behaviour as the Supabase version).

---

## Phase 4 — Frontend Changes

### 1. Remove Supabase SDK

```bash
# in talent-gateway/
bun remove @supabase/supabase-js
```

### 2. Replace `src/lib/supabase.ts`

Delete. Replace with:

```ts
// src/lib/api.ts
export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
```

### 3. Replace `src/lib/jobService.ts`

- `supabase.from('jobs').select(...)` → `fetch(\`${API_BASE}/jobs\`)` wrapper
- `supabase.from('jobs').select(...).eq('id', id)` → `fetch(\`${API_BASE}/jobs/${id}\`)`
- `Job` interface type: **unchanged**

### 4. Replace `src/lib/applicationService.ts`

- `submitApplication()` → `POST /api/applications` via `FormData` (multipart)
- `ApplicationPayload` type: **unchanged**
- Component code (`Index.tsx`, `JobDetail.tsx`): **no changes needed**

### 5. Environment variables

| Old (Supabase) | New (self-hosted) |
|---|---|
| `VITE_SUPABASE_URL` | removed |
| `VITE_SUPABASE_API_TOKEN` | removed |
| _(none)_ | `VITE_API_URL=https://your-domain.com/api` |

---

## Phase 5 — Nginx Reverse Proxy

```nginx
# docker/nginx/nginx.conf
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate     /etc/nginx/certs/fullchain.pem;
  ssl_certificate_key /etc/nginx/certs/privkey.pem;

  # Frontend static files
  location / {
    proxy_pass http://frontend:80;
  }

  # Public API and Odoo gateway (same origin for CORS simplicity)
  location /api/ {
    proxy_pass http://api:3000;
    proxy_set_header X-Real-IP $remote_addr;
  }
  location /functions/ {
    proxy_pass http://api:3000;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # MinIO admin console — restrict by IP in production
  location /minio-console/ {
    proxy_pass http://minio:9001/;
  }
}

server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$host$request_uri;
}
```

---

## Phase 6 — Dockerfiles

### api/Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### talent-gateway/Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## Phase 7 — Environment Variables (.env.example)

```dotenv
# PostgreSQL
POSTGRES_DB=recruitment
POSTGRES_USER=gateway
POSTGRES_PASSWORD=change_me_strong_password

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change_me_strong_password
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false

# API service
ODOO_API_KEY=change_me_with_long_random_secret_min_32_chars
ALLOWED_ORIGIN=https://your-domain.com
DATABASE_URL=postgres://gateway:change_me_strong_password@postgres:5432/recruitment

# Frontend (Vite build-time)
VITE_API_URL=https://your-domain.com/api
```

`.env` is `.gitignore`d. Never commit real credentials.

---

## Phase 8 — Odoo Configuration Change (minimal)

Only one change in the Odoo module — update the base URL. All request/response contracts are identical.

```python
# Before (Supabase)
GATEWAY_BASE_URL = "https://<project-ref>.supabase.co/functions/v1"

# After (self-hosted)
GATEWAY_BASE_URL = "https://your-domain.com/functions/v1"
```

No Odoo Python model changes. No request body changes. No header changes.

---

## Feature Preservation Checklist

| Feature | Preserved? | Notes |
|---|---|---|
| `jobs` table schema | ✅ | Identical DDL, RLS dropped (not needed with private network) |
| `applications`, `experience`, `education` tables | ✅ | Identical DDL |
| `odoo_job_id` key format `OD-{id}` | ✅ | Unchanged in push-job route |
| `gateway_sync_status` lifecycle (`new` → `imported`/`failed`) | ✅ | patch-application route |
| `odoo_applicant_id` write-back | ✅ | patch-application route |
| Signed file URLs with 24 h expiry | ✅ | MinIO `presignedGetObject` replaces Supabase signed URLs |
| Gap 1: date padding `YYYY-MM` → `YYYY-MM-01` | ✅ | Logic kept in get-applications route |
| Gap 2: education `level` key mapping (display label → Odoo key) | ✅ | Logic kept in get-applications route |
| CV + accolade file upload | ✅ | MinIO, same bucket name and path convention |
| Odoo `Bearer` token auth on all 4 routes | ✅ | `bearerAuth` middleware |
| CORS `ALLOWED_ORIGIN` | ✅ | Fastify CORS plugin |
| `submission_failed` rollback on error | ✅ | Same try/catch pattern in API route |
| HEAD `/functions/v1/odoo-get-jobs` (test connection) | ✅ | Explicit HEAD handler in `odooJobs.ts` |
| `job_ids` query param filtering in get-applications | ✅ | Same query param contract |
| `status` query param filtering in get-applications | ✅ | Same query param contract |

---

## Implementation Order

- [ ] **Step 0** — `git checkout -b feat/docker-self-hosted`
- [ ] **Step 1** — `docker/postgres/init.sql` (strip RLS from `migration_full.sql`)
- [ ] **Step 2** — `docker-compose.yml` (postgres + minio + api + frontend + nginx services)
- [ ] **Step 3** — `.env.example`
- [ ] **Step 4** — `api/` scaffold (package.json, tsconfig.json, Dockerfile)
- [ ] **Step 5** — `api/src/db.ts` — postgres.js pool
- [ ] **Step 6** — `api/src/storage.ts` — MinIO client, bucket-ensure, presignHelper
- [ ] **Step 7** — `api/src/middleware/bearerAuth.ts`
- [x] **Step 8** — `api/src/routes/odooJobs.ts` — port `odoo-get-jobs` + `odoo-push-job`
- [x] **Step 9** — `api/src/routes/odooApplications.ts` — port `odoo-get-applications` + `odoo-patch-application`
- [x] **Step 10** — `api/src/routes/publicJobs.ts`
- [x] **Step 11** — `api/src/routes/publicApplications.ts` (multipart upload)
- [x] **Step 12** — `api/src/index.ts` — wire all routes
- [x] **Step 13** — Frontend: remove `@supabase/supabase-js`, add `api.ts`, rewrite `jobService.ts` + `applicationService.ts`
- [x] **Step 14** — `talent-gateway/Dockerfile` + `docker/nginx-frontend.conf`
- [x] **Step 15** — `docker/nginx/nginx.conf` (reverse proxy)
- [x] **Step 16** — `docker compose up --build` local smoke test  
  _Smoke test results (2026-03-12): HTTP→HTTPS 301 ✅ · `GET /api/jobs` 200 ✅ · Auth gate `HEAD /functions/v1/odoo-get-jobs` 401 ✅ · Frontend SPA 200 ✅_
- [ ] **Step 17** — Update Odoo `GATEWAY_BASE_URL`  
  In `odoo_server.md / HR Recruitment module config`, change:
  ```
  GATEWAY_BASE_URL = "https://<your-domain>/functions/v1"
  ```
  The four paths remain identical to the Supabase POC:
  - `GET  /functions/v1/odoo-get-jobs`
  - `POST /functions/v1/odoo-push-job`
  - `GET  /functions/v1/odoo-get-applications`
  - `PATCH /functions/v1/odoo-patch-application`
- [ ] **Step 18** — Tag `v1.0.0-docker`, open PR to `main`  
  ```bash
  git tag v1.0.0-docker
  git push origin feat/docker-self-hosted --tags
  # Then open PR on GitHub: feat/docker-self-hosted → main
  ```
