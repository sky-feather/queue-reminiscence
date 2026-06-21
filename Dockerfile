# syntax=docker/dockerfile:1
# Single image containing all three apps.
# Set APP=api|admin-web|public-web at runtime to select which process starts.

# ── Stage 1: workspace deps ──────────────────────────────────────────
FROM oven/bun:1.2.23-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json        ./apps/api/
COPY apps/admin-web/package.json  ./apps/admin-web/
COPY apps/public-web/package.json ./apps/public-web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json     ./packages/db/
COPY packages/domain/package.json ./packages/domain/
COPY packages/ui/package.json     ./packages/ui/

RUN bun install --frozen-lockfile

# ── Stage 2: build admin-web ─────────────────────────────────────────
FROM deps AS admin-builder
COPY packages/ ./packages/
COPY apps/admin-web ./apps/admin-web
ENV GCP_BUILDPACKS=1
RUN bun run --cwd apps/admin-web build

# ── Stage 3: build public-web ────────────────────────────────────────
FROM deps AS public-builder
COPY packages/ ./packages/
COPY apps/public-web ./apps/public-web
ENV GCP_BUILDPACKS=1
RUN bun run --cwd apps/public-web build

# ── Stage 4: final runtime ───────────────────────────────────────────
FROM oven/bun:1.2.23-alpine
WORKDIR /app

# Shared node_modules and workspace package sources (needed by api at runtime)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/config  ./packages/config
COPY packages/db      ./packages/db
COPY packages/domain  ./packages/domain
COPY packages/ui      ./packages/ui

# API source
COPY apps/api ./apps/api

# Built frontend artifacts
COPY --from=admin-builder /app/apps/admin-web/build ./apps/admin-web/build
COPY --from=public-builder /app/apps/public-web/build ./apps/public-web/build

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
