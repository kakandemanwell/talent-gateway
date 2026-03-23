# Odoo Admin Guide: Fixing Attachment Downloads During Application Sync

**Audience:** Odoo server administrator  
**Context:** EPRC Jobs Portal — Docker self-hosted stack  
**Symptom:** Job applications sync successfully from the portal, but CV files and
education-accolade attachments fail to download (URLs are present in the JSON
response but the download itself errors out).

---

## Why This Happens

When the Odoo cron job calls `GET /functions/v1/odoo-get-applications`, the API
responds with presigned HTTPS URLs for each attachment, for example:

```
https://jobs.eprc.example.com/application-files/cv/abc123.pdf?X-Amz-Signature=...
```

These URLs point to the **portal's public domain** (`MINIO_PUBLIC_URL`).  
The portal's nginx reverse-proxy intercepts requests to `/application-files/`
and forwards them internally to MinIO — it passes `Host: minio:9000` so that
MinIO's HMAC signature stays valid.

The download fails when the Odoo server **cannot reach that public URL**.
The two most common causes are:

| # | Root cause | Typical symptom |
|---|---|---|
| 1 | The portal domain does not resolve from the Odoo server's network | `getaddrinfo` / DNS failure |
| 2 | The Odoo server's firewall or proxy blocks outbound HTTPS (port 443) to the portal host | `Connection refused` / timeout |

---

## Step 1 — Verify DNS Resolution on the Odoo Server

SSH into the Odoo host and run:

```bash
nslookup jobs.eprc.example.com
# or
dig +short jobs.eprc.example.com
```

**Expected:** Returns the public IP of the portal server.  
**If it fails:** Add the domain to the Odoo host's `/etc/hosts` file (as a
temporary workaround) or fix DNS via your internal DNS server / registrar.

```bash
# /etc/hosts workaround — replace with the actual portal server IP
echo "203.0.113.50  jobs.eprc.example.com" | sudo tee -a /etc/hosts
```

---

## Step 2 — Verify HTTPS Reachability

From the Odoo server, confirm that port 443 is open and the TLS handshake works:

```bash
curl -v --head "https://jobs.eprc.example.com/application-files/"
```

**Expected:** HTTP 403 or 400 response (MinIO rejects a bare bucket request
without a valid presigned signature — that is correct behaviour here).  
Any TLS error, timeout, or `Connection refused` means the Odoo server cannot
reach the portal over HTTPS.

**If blocked:**

- Allow outbound TCP 443 to the portal IP in the Odoo server's firewall /
  security-group rules.
- If Odoo traffic goes through a corporate HTTP proxy, configure the proxy
  address in Odoo's system parameters or the OS environment (see Step 4).

---

## Step 3 — Test a Real Presigned URL

Trigger the applications sync manually **once** (so the API generates fresh
presigned URLs), then capture a `cv_url` value from the JSON response and try
to download it directly:

```bash
# Get the JSON (replace with your actual API key and job IDs)
curl -s \
  -H "Authorization: Bearer <ODOO_API_KEY>" \
  "https://jobs.eprc.example.com/functions/v1/odoo-get-applications?job_ids=OD-1" \
  | python3 -m json.tool | grep cv_url
```

Copy the `cv_url` value and test the download:

```bash
curl -L -o /tmp/test_cv.pdf "<paste cv_url here>"
echo "Exit code: $?"
ls -lh /tmp/test_cv.pdf
```

**Expected:** Exit code 0, a non-zero file size matching the original CV.  
**If this succeeds from the terminal but Odoo still fails**, continue to Step 4.

---

## Step 4 — Check Odoo's Outbound HTTP/HTTPS Settings

Odoo's built-in HTTP client respects the standard proxy environment variables.
Check whether a proxy is configured and whether it allows HTTPS to the portal:

### 4a — OS-level proxy (affects all processes including Odoo)

```bash
echo $http_proxy
echo $https_proxy
echo $no_proxy
```

If a proxy is set, make sure the portal domain is **not** in `no_proxy` (unless
the proxy is the correct path to the internet) and that the proxy itself can
reach port 443.

### 4b — Odoo system parameters

In Odoo backend:

1. Navigate to **Settings → Technical → Parameters → System Parameters**.
2. Search for `web.base.url` — this should be the Odoo public URL, not the
   portal URL (leave it unchanged).
3. Search for `ir.config_parameter` keys related to `http_proxy` if any exist.

### 4c — Python `requests` / `urllib` SSL certificate verification

If Odoo logs a TLS error such as `SSL: CERTIFICATE_VERIFY_FAILED`, the portal's
TLS certificate is either self-signed or issued by a CA that is not trusted by
the Odoo server.

**Option A (recommended) — Install the CA certificate on the Odoo server:**

```bash
# Copy the portal's CA or self-signed cert to the trusted store
sudo cp portal-ca.crt /usr/local/share/ca-certificates/eprc-portal.crt
sudo update-ca-certificates
```

**Option B — Pass the CA bundle path to the Odoo process** (if you cannot
modify the system trust store):

Add to `/etc/odoo/odoo.conf` (or your Odoo service environment):

```ini
[options]
# point to a bundle that includes the portal CA
# leave blank to use the OS default store
```

Or add the environment variable before starting the Odoo service:

```bash
export REQUESTS_CA_BUNDLE=/path/to/portal-ca-bundle.crt
```

---

## Step 5 — Confirm URL Expiry is Not a Factor

Each presigned URL is valid for **24 hours** from the moment the
`/functions/v1/odoo-get-applications` response was generated.  
The response body contains `cv_url_expires_at` (ISO 8601 timestamp) for each
application.

If your Odoo cron job fetches the list and then queues downloads for later, make
sure the downloads complete within that 24-hour window.  
If you need a longer TTL, ask the portal administrator to increase
`SIGNED_URL_TTL` in the API's `storage.ts` and redeploy.

---

## Step 6 — Re-run the Sync and Inspect Odoo Logs

Once the network / TLS issues above are resolved:

1. Manually trigger the Odoo cron job:  
   **Technical → Automation → Scheduled Actions → "Sync Applications from EPRC Portal"** → Run Manually.

2. Check the Odoo server log (`/var/log/odoo/odoo.log`) for errors related to
   the job execution.

3. If downloads still fail, enable Odoo debug logging temporarily and look for
   the HTTP request to the presigned URL and the response status code.

---

## Quick Reference: What the Portal Returns

The `GET /functions/v1/odoo-get-applications` endpoint returns a JSON structure
like the following for each application.  
The fields to act on for attachments are `cv_url` and `education[].accolade_url`:

```jsonc
{
  "applications": [
    {
      "application_ref": "uuid",
      "job_id": "OD-1",
      "submitted_at": "2026-03-15T10:30:00.000Z",
      "personal": { "full_name": "...", "email": "...", "phone": "..." },
      "summary": "...",
      "cv_url": "https://jobs.eprc.example.com/application-files/cv/uuid.pdf?X-Amz-...",
      "cv_url_expires_at": "2026-03-16T10:30:00.000Z",   // 24 h from fetch time
      "experience": [ /* ... */ ],
      "education": [
        {
          "qualification": "Bachelor of Science",
          "level": "bachelor",
          "field_of_study": "Computer Science",
          "institution": "University of Nairobi",
          "year_completed": 2020,
          "accolade_url": "https://jobs.eprc.example.com/application-files/accolades/uuid.pdf?X-Amz-..."
        }
      ]
    }
  ],
  "total": 1,
  "fetched_at": "2026-03-15T10:30:00.000Z"
}
```

The Odoo integration code should:

1. Download the file at `cv_url` using an authenticated HTTP GET request
   (no extra auth header needed — the HMAC signature in the query string
   is the access credential).
2. Store the downloaded bytes as an `ir.attachment` linked to the applicant
   record.
3. Do the same for each `education[].accolade_url` that is non-null.
4. After all attachments are saved, call  
   `PATCH /functions/v1/odoo-patch-application` with  
   `{ "application_ref": "uuid", "status": "imported" }`  
   so the portal marks the application as processed and will not return it on
   the next sync cycle.

---

## Summary Checklist

- [ ] Portal domain resolves from the Odoo server (`nslookup` / `dig`)
- [ ] Outbound TCP 443 to the portal IP is allowed in all firewalls / security groups
- [ ] TLS certificate is trusted by the Odoo server's OS CA store
- [ ] No misconfigured proxy is intercepting / blocking HTTPS downloads
- [ ] Odoo download logic executes within 24 h of fetching the application list
- [ ] After a successful import, `PATCH /functions/v1/odoo-patch-application` is called with `status: "imported"`

If all of the above are satisfied and downloads still fail, contact the portal
administrator with the exact error message from the Odoo log so they can inspect
the nginx and MinIO logs on the server side.
