# EPRC Jobs Portal

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd eprc-jobs-portal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port) or `http://localhost:8080`.

---

## Deployment (Docker Stack)

The production stack runs five containers — PostgreSQL, MinIO, API, Frontend, and Nginx — orchestrated by `docker-compose.yml`.

### 1. Create your `.env` file

```bash
cp .env.example .env
```

Fill in every value. See the rules below before generating secrets.

#### Secrets — always use hex strings

Docker Compose performs shell-style variable substitution on `.env` values. Any `$WORD` inside a value is silently replaced with the value of that environment variable (or an empty string if it is not set). This will **corrupt secrets** that contain `$`.

Always generate secrets as hex strings — they contain only `0-9 a-f` and are never misinterpreted:

```bash
node -e "console.log(require('crypto').randomBytes(40).toString('hex'))"
```

Use this for `ODOO_API_KEY`, `POSTGRES_PASSWORD`, and `MINIO_ROOT_PASSWORD`.

### 2. TLS — Local vs Production

#### Local development (no domain)

Leave `CERTBOT_DOMAIN` and `CERTBOT_EMAIL` blank in `.env`. On first start, the nginx container automatically generates a self-signed certificate and nginx starts immediately. No manual steps needed.

**Note for cross-machine testing** (e.g. Odoo in a VM calling this stack):

- The self-signed cert must be regenerated with the **host machine's LAN IP** as the
  `CN` and `subjectAltName` — `CN=localhost` will fail hostname verification from any
  other machine.
- Python's `requests` library (used by Odoo) does **not** use the OS certificate store.
  It uses the `certifi` package's own CA bundle. After installing the cert on the OS with
  `update-ca-certificates`, you must also append it to certifi:

  ```bash
  docker exec <odoo-container> python3 -c "
  import certifi
  cert = open('/path/to/eprc-gateway.crt').read()
  open(certifi.where(), 'a').write(cert)
  "
  ```

Both issues are avoided entirely in production by using a real domain with Let's Encrypt.

#### Production (real domain)

Set these two values in `.env`:

```env
CERTBOT_DOMAIN=jobs.eprc.org
CERTBOT_EMAIL=admin@eprc.org
```

On first `docker compose up`, the nginx container will:
1. Generate a temporary self-signed cert so nginx starts immediately
2. Request a real Let's Encrypt certificate via the HTTP-01 webroot challenge
3. Copy the issued cert into place and reload nginx (zero downtime)
4. Run a renewal check every 12 hours and reload nginx after any successful renewal

**Prerequisites for Let's Encrypt to succeed:**
- The domain's DNS A record must point to the server's public IP before starting
- Port 80 must be reachable from the internet (Let's Encrypt uses it to verify domain ownership)

No manual certificate steps are required. The same `docker compose up` command works for both local and production — only the `.env` values differ.

### 3. Start the stack

```bash
docker compose up -d
```

### 4. Odoo integration

Set `GATEWAY_BASE_URL` in the Odoo module configuration to the gateway root — no path suffix:

```
https://jobs.eprc.org
```

The module appends `/functions/v1/<route>` itself. The five gateway endpoints are:

| Method | Path |
|--------|------|
| `HEAD` | `/functions/v1/odoo-get-jobs` (test connection) |
| `GET`  | `/functions/v1/odoo-get-jobs` |
| `POST` | `/functions/v1/odoo-push-job` |
| `GET`  | `/functions/v1/odoo-get-applications` |
| `PATCH`| `/functions/v1/odoo-patch-application` |

All requests must include:
```
Authorization: Bearer <ODOO_API_KEY>
```