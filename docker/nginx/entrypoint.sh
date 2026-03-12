#!/bin/sh
# entrypoint.sh — EPRC Jobs Portal nginx entrypoint
#
# Behaviour:
#   1. If no cert exists in $CERT_DIR, generate a self-signed one so nginx
#      can always start (works for local dev with no domain configured).
#   2. Start nginx in the background.
#   3. If CERTBOT_DOMAIN and CERTBOT_EMAIL are both set, request a real
#      Let's Encrypt certificate via the webroot challenge.
#      On success: copy to $CERT_DIR and reload nginx (zero downtime).
#      On failure: log a warning and keep the self-signed cert.
#   4. Start a background renewal loop that checks every 12 hours.
#      After successful renewal, reload nginx automatically.
#   5. Wait for nginx — container lifetime equals nginx lifetime.

set -e

CERT_DIR="/etc/nginx/certs"
WEBROOT="/var/www/certbot"
LE_LIVE="/etc/letsencrypt/live"

mkdir -p "$CERT_DIR" "$WEBROOT"

# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Ensure a certificate exists so nginx can start
# ─────────────────────────────────────────────────────────────────────────────
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  COMMON_NAME="${CERTBOT_DOMAIN:-localhost}"
  echo "[cert-init] No certificate found — generating self-signed cert for: $COMMON_NAME"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out    "$CERT_DIR/fullchain.pem" \
    -subj   "/CN=$COMMON_NAME/O=EPRC" 2>/dev/null
  echo "[cert-init] Self-signed certificate created."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Start nginx
# ─────────────────────────────────────────────────────────────────────────────
echo "[cert-init] Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Forward SIGTERM/SIGINT to nginx so 'docker stop' works cleanly
trap 'kill "$NGINX_PID" 2>/dev/null; exit 0' TERM INT

# ─────────────────────────────────────────────────────────────────────────────
# Step 3 — Obtain Let's Encrypt certificate (if domain is configured)
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "$CERTBOT_DOMAIN" ] && [ -n "$CERTBOT_EMAIL" ]; then

  sleep 3  # give nginx a moment to be fully accepting requests

  echo "[cert-init] Requesting Let's Encrypt certificate for: $CERTBOT_DOMAIN"

  if certbot certonly \
      --webroot \
      --webroot-path="$WEBROOT" \
      --non-interactive \
      --agree-tos \
      --email    "$CERTBOT_EMAIL" \
      -d         "$CERTBOT_DOMAIN" \
      --keep-until-expiring; then

    echo "[cert-init] Certificate issued. Copying to nginx certs directory..."
    cp "$LE_LIVE/$CERTBOT_DOMAIN/fullchain.pem" "$CERT_DIR/fullchain.pem"
    cp "$LE_LIVE/$CERTBOT_DOMAIN/privkey.pem"   "$CERT_DIR/privkey.pem"
    nginx -s reload
    echo "[cert-init] Let's Encrypt certificate active. nginx reloaded."

  else
    echo "[cert-init] WARNING: Could not obtain Let's Encrypt certificate."
    echo "[cert-init] Continuing with self-signed certificate."
  fi

  # ───────────────────────────────────────────────────────────────────────────
  # Step 4 — Renewal loop (every 12 hours)
  # ───────────────────────────────────────────────────────────────────────────
  (
    while true; do
      sleep 43200  # 12 hours
      echo "[cert-renew] Running Let's Encrypt renewal check..."

      if certbot renew \
          --webroot \
          --webroot-path="$WEBROOT" \
          --quiet; then

        # Copy renewed certs if letsencrypt data exists
        if [ -d "$LE_LIVE/$CERTBOT_DOMAIN" ]; then
          cp "$LE_LIVE/$CERTBOT_DOMAIN/fullchain.pem" "$CERT_DIR/fullchain.pem"
          cp "$LE_LIVE/$CERTBOT_DOMAIN/privkey.pem"   "$CERT_DIR/privkey.pem"
          nginx -s reload
          echo "[cert-renew] Certificate renewed successfully. nginx reloaded."
        fi

      else
        echo "[cert-renew] Renewal check complete — no renewal needed or renewal failed."
      fi
    done
  ) &

fi

# ─────────────────────────────────────────────────────────────────────────────
# Keep the container alive until nginx exits
# ─────────────────────────────────────────────────────────────────────────────
wait "$NGINX_PID"
