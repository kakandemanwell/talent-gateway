# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json bun.lockb* package-lock.json* ./
# Install production + dev deps (needed for the Vite build)
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy source and build
COPY . .

# VITE_API_URL must be set at build time.  When running behind the nginx
# reverse-proxy on the same container the value "/api" is the default
# defined in api.ts, so it is not required here unless you serve the
# frontend on a different origin.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the nginx static-server configuration
COPY docker/nginx/nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
