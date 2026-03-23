# EPRC Jobs Portal

A self-hosted recruitment portal that publishes job vacancies, accepts candidate
applications (with file uploads), and synchronises with an Odoo HR back-end via
a REST gateway API.

---

## Architecture

```
Internet
   │
   ▼
nginx  :80/:443  ── /application-files/*  ──▶  MinIO  :9000  (file storage)
   │             ── /api/*  /functions/*  ──▶  API    :3000  (Node.js/Fastify)
   │             ── /*                   ──▶  Frontend :80   (React/Vite SPA)
   │
   └── All four services share one internal Docker bridge network.
       Only nginx is exposed to the internet.
```

| Container  | Role |
|------------|------|
| `nginx`    | Reverse proxy, TLS termination, MinIO file-download proxy |
| `api`      | REST API — public job/application routes + Odoo gateway routes |
| `frontend` | Pre-built React SPA served by a second nginx instance |
| `postgres` | PostgreSQL 16 — relational data store |
| `minio`    | MinIO — S3-compatible object store for CV and accolade files |

---

## Local Development (frontend only)

```bash
# Install dependencies
npm install

# Start Vite dev server (hot reload)
npm run dev
```

The app is available at `http://localhost:5173`.  
In this mode the frontend talks to the API via the `VITE_API_URL` defined in
`.env` (or the default `/api` proxy in `vite.config.ts`).

---

## Full Stack Deployment (Docker)

### 1. Prerequisites

- Docker Engine 24+ and Docker Compose v2 (`docker compose`)
- A public domain with its DNS A record pointing to the server (production only)
- Ports 80 and 443 open inbound (production) or just 80 (local)

---

### 2. Create the environment file

```bash
cp .env.example .env
```

Edit `.env` and fill in every value. The full reference is below.

#### Generating secrets safely

Docker Compose performs shell-style variable substitution on `.env` values —
any `$WORD` inside a value is silently replaced with an environment variable.
This **corrupts** secrets that happen to contain `$` (common in random strings).

Always generate secrets as **hex strings** (only `0-9 a-f`, never `$`):

```bash
node -e "console.log(require('crypto').randomBytes(40).toString('hex'))"
```

Use the above for `ODOO_API_KEY`, `POSTGRES_PASSWORD`, and `MINIO_ROOT_PASSWORD`.

---

### 3. Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_DB` | yes | Database name (e.g. `recruitment`) |
| `POSTGRES_USER` | yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | yes | PostgreSQL password — generate as hex |
| `DATABASE_URL` | yes | Full connection string used by the API container, e.g. `postgres://gateway:<password>@postgres:5432/recruitment` |
| `MINIO_ROOT_USER` | yes | MinIO root username |
| `MINIO_ROOT_PASSWORD` | yes | MinIO root password — generate as hex |
| `MINIO_PUBLIC_URL` | yes | **Public HTTPS base URL of this server** (e.g. `https://jobs.eprc.org`). Presigned attachment download URLs are rewritten to this host so that Odoo, on its own network, can fetch files. See [Attachment downloads](#attachment-downloads--minio_public_url) below. |
| `ODOO_API_KEY` | yes | Shared secret between this gateway and Odoo — generate as hex, minimum 32 chars. Must match the value configured in the Odoo module. |
| `ALLOWED_ORIGIN` | yes | CORS allowed origin for the public API, e.g. `https://jobs.eprc.org` |
| `VITE_API_URL` | yes | API base URL as seen by the browser, e.g. `https://jobs.eprc.org/api` (build-time) |
| `CERTBOT_DOMAIN` | production | Public domain for Let's Encrypt, e.g. `jobs.eprc.org`. Leave blank for local dev. |
| `CERTBOT_EMAIL` | production | Admin e-mail for Let's Encrypt. Leave blank for local dev. |

---

### 4. Generating the ODOO_API_KEY

The API key is the only credential protecting every Odoo gateway endpoint.
Treat it like a password.

**Generate:**

```bash
node -e "console.log(require('crypto').randomBytes(40).toString('hex'))"
# → e.g. a3f8c2...  (80 hex chars)
```

**Set in `.env`:**

```env
ODOO_API_KEY=a3f8c2<rest of your generated key>
```

**Set in Odoo:**

In the Odoo module configuration (Settings → EPRC Jobs Gateway or equivalent):

| Field | Value |
|-------|-------|
| Gateway Base URL | `https://jobs.eprc.org` (no trailing slash, no path) |
| API Key | The same hex string you put in `.env` |

Every gateway request is authenticated with:

```
Authorization: Bearer <ODOO_API_KEY>
```

A wrong or missing key returns `HTTP 401 Unauthorized`. A blank `ODOO_API_KEY`
on the server side returns `HTTP 500` and logs a misconfiguration error.

---

### 5. TLS — local vs production

#### Local development (no domain / self-signed)

Leave `CERTBOT_DOMAIN` and `CERTBOT_EMAIL` blank. On first start the nginx
container auto-generates a self-signed certificate and starts immediately.

**Cross-machine testing** (e.g. Odoo in a VM calling this stack on your LAN):

- The self-signed cert must be regenerated with the host machine's **LAN IP**
  as both `CN` and `subjectAltName`. A cert with `CN=localhost` fails hostname
  verification from any other machine.
- Python's `requests` library (used internally by Odoo) does **not** use the
  OS certificate store — it uses the `certifi` bundle. After trusting the cert
  at the OS level you must also append it to certifi inside the Odoo container:

  ```bash
  docker exec <odoo-container> python3 -c "
  import certifi, shutil
  shutil.copy(certifi.where(), certifi.where() + '.bak')
  open(certifi.where(), 'a').write(open('/tmp/eprc-gateway.crt').read())
  "
  ```

Both issues disappear in production with a real Let's Encrypt certificate.

#### Production (real domain + Let's Encrypt)

```env
CERTBOT_DOMAIN=jobs.eprc.org
CERTBOT_EMAIL=admin@eprc.org
```

On first `docker compose up` the nginx container will:

1. Generate a temporary self-signed cert so nginx starts immediately.
2. Request a real Let's Encrypt certificate via the HTTP-01 webroot challenge.
3. Copy the issued cert into place and reload nginx (zero downtime).
4. Run a renewal check every 12 hours; reload nginx after any successful renewal.

**Prerequisites:**
- DNS A record for `CERTBOT_DOMAIN` must point to the server's public IP *before* starting.
- Port 80 must be reachable from the internet (Let's Encrypt domain-ownership check).

---

### 6. Start the stack

```bash
docker compose up -d

# Tail combined logs
docker compose logs -f

# Check running containers
docker compose ps
```

---

### 7. Verify the deployment

```bash
# Health check
curl https://jobs.eprc.org/health
# → {"status":"ok"}

# Odoo test-connection (HEAD request)
curl -I -H "Authorization: Bearer <ODOO_API_KEY>" \
  https://jobs.eprc.org/functions/v1/odoo-get-jobs
# → HTTP/2 200
```

---

## Odoo Integration

### Gateway endpoint reference

The Odoo module must set **Gateway Base URL** to the portal root (no trailing
slash). It appends `/functions/v1/<route>` automatically.

| Method | Path | Purpose |
|--------|------|---------|
| `HEAD` | `/functions/v1/odoo-get-jobs` | Test connection / liveness check |
| `GET`  | `/functions/v1/odoo-get-jobs` | Retrieve all published jobs |
| `POST` | `/functions/v1/odoo-push-job` | Create or update a job vacancy |
| `GET`  | `/functions/v1/odoo-get-applications` | Pull new applications (with signed file URLs) |
| `PATCH`| `/functions/v1/odoo-patch-application` | Mark an application as imported |

All five endpoints require:

```
Authorization: Bearer <ODOO_API_KEY>
```

---

### Job sync (Odoo → Portal)

Odoo calls `POST /functions/v1/odoo-push-job` whenever an `hr.job` record is
created, written, or archived. The gateway upserts the job keyed on `job_id`
(the Odoo record ID, e.g. `"OD-1"`).

**Request body:**

```json
{
  "job_id":      "OD-1",
  "title":       "Software Engineer",
  "department":  "ICT",
  "location":    "Nairobi",
  "closing_date":"2026-04-30",
  "description": "<html or plain text>",
  "is_active":   true
}
```

---

### Application sync (Portal → Odoo)

Odoo calls `GET /functions/v1/odoo-get-applications` (typically via a daily
cron at 17:00 EAT) to pull applications that have not yet been imported.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `job_ids` | yes | Comma-separated list of Odoo job IDs, e.g. `OD-1,OD-5` |
| `status`  | no  | Filter by `gateway_sync_status`. Defaults to `new`. Pass `imported` to re-fetch already-processed records. |

**Response shape (abbreviated):**

```jsonc
{
  "applications": [
    {
      "application_ref": "<uuid>",           // use this as the key for PATCH
      "job_id": "OD-1",
      "submitted_at": "2026-03-15T10:30:00.000Z",
      "personal": {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+254700000000"
      },
      "summary": "Experienced engineer...",
      "cv_url": "https://jobs.eprc.org/application-files/cv/<uuid>.pdf?X-Amz-...",
      "cv_url_expires_at": "2026-03-16T10:30:00.000Z",  // 24 h from fetch time
      "experience": [
        {
          "position": "Engineer",
          "employer": "Acme Ltd",
          "start_date": "2020-01-01",
          "end_date": null,
          "is_current": true,
          "years": 6
        }
      ],
      "education": [
        {
          "qualification": "Bachelor of Science",
          "level": "bachelor",
          "field_of_study": "Computer Science",
          "institution": "University of Nairobi",
          "year_completed": 2019,
          "accolade_url": "https://jobs.eprc.org/application-files/accolades/<uuid>.pdf?X-Amz-..."
        }
      ]
    }
  ],
  "total": 1,
  "fetched_at": "2026-03-15T10:30:00.000Z"
}
```

---

### Attachment downloads (`MINIO_PUBLIC_URL`)

CV and accolade files are stored in MinIO, which lives on the internal Docker
network and is **not** directly reachable from outside. The API generates
**presigned HTTPS URLs** that point to the portal's public domain (set via
`MINIO_PUBLIC_URL`). nginx intercepts requests to `/application-files/*` and
proxies them internally to MinIO while preserving the `Host: minio:9000` header
so the HMAC signature stays valid.

**This means `MINIO_PUBLIC_URL` must be set to the portal's public HTTPS URL**
before Odoo can download attachments:

```env
MINIO_PUBLIC_URL=https://jobs.eprc.org
```

Each presigned URL is valid for **24 hours** from the time
`/functions/v1/odoo-get-applications` was called. The Odoo integration code
must download the files within that window.

If the Odoo server cannot reach the presigned URL, see
[`ODOO_ATTACHMENT_DOWNLOAD_GUIDE.md`](ODOO_ATTACHMENT_DOWNLOAD_GUIDE.md) for
a full diagnostic and fix checklist.

---

### Marking applications as imported (PATCH)

After Odoo successfully creates an `hr.applicant` record, it must call:

```
PATCH /functions/v1/odoo-patch-application
Authorization: Bearer <ODOO_API_KEY>
Content-Type: application/json

{
  "application_ref":  "<uuid from application_ref field>",
  "status":           "imported",
  "odoo_applicant_id": 42          // optional — Odoo record ID
}
```

This sets `gateway_sync_status = 'imported'` on the portal so the application
is excluded from future sync calls. Without this PATCH, the same application
will be returned on every subsequent sync.

Allowed `status` values: `"imported"` | `"failed"` | `"new"`.

---

## Environment File Quick Reference

```env
# PostgreSQL
POSTGRES_DB=recruitment
POSTGRES_USER=gateway
POSTGRES_PASSWORD=<hex secret>
DATABASE_URL=postgres://gateway:<hex secret>@postgres:5432/recruitment

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<hex secret>
MINIO_PUBLIC_URL=https://jobs.eprc.org   # ← required for attachment downloads

# API
ODOO_API_KEY=<hex secret, min 32 chars>  # ← must match Odoo module config
ALLOWED_ORIGIN=https://jobs.eprc.org

# Frontend (build-time)
VITE_API_URL=https://jobs.eprc.org/api

# TLS (blank = self-signed for local dev)
CERTBOT_DOMAIN=jobs.eprc.org
CERTBOT_EMAIL=admin@eprc.org
```

---

## Useful Commands

```bash
# Rebuild and restart a single service after a code change
docker compose up -d --build api

# View API logs
docker compose logs -f api

# Open a PostgreSQL shell
docker compose exec postgres psql -U gateway -d recruitment

# Open the MinIO admin console (localhost only — not exposed publicly)
# Browse to http://localhost:9001 after forwarding or on the server itself.

# Run frontend unit tests
npm run test
```