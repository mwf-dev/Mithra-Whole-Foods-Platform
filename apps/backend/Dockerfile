# Medusa backend for GCP Cloud Run.
# Build from the REPO ROOT (pnpm workspace context):
#   docker build -f apps/backend/Dockerfile \
#     --build-arg STOREFRONT_URL=https://<your-storefront> -t mithra-backend .
#
# Run migrations as a separate Cloud Run Job with the same image:
#   command: ["npx", "medusa", "db:migrate"]
# Never run the seed automatically — one-off job only.

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Registry resilience.
#
# The `.medusa/server` install near the bottom of this stage runs with
# `--ignore-workspace` against a generated package.json that has NO lockfile, so
# pnpm must resolve ~1,150 packages from scratch — over a thousand metadata
# requests. Railway's builders egress from shared cloud IPs that
# registry.npmjs.org throttles, and on 2026-08-07 that combination returned
# ERR_PNPM_FETCH_429 and failed the deploy outright.
#
# Fewer parallel requests plus patient retries turn a hard failure into a
# slightly slower build. Set as env rather than an .npmrc because the install
# below runs from a different working directory, and `--ignore-workspace` stops
# pnpm walking up to find a root .npmrc.
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=10000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000 \
    NPM_CONFIG_NETWORK_CONCURRENCY=4

# Workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --filter @dtc/backend --frozen-lockfile

COPY apps/backend apps/backend

# Baked into the admin bundle (live-preview iframe / postMessage target)
ARG STOREFRONT_URL=http://localhost:8000
ENV STOREFRONT_URL=$STOREFRONT_URL

RUN cd apps/backend && pnpm build

# Production dependencies for the built server output.
# --ignore-workspace: without it pnpm walks up to /app's workspace root and
# installs nothing into .medusa/server/node_modules.
#
# --prefer-offline: the workspace install above already populated pnpm's store
# and metadata cache in this same stage, so most of what this step needs is
# already on disk. Preferring it collapses the bulk of the registry traffic that
# triggered the 429 — see the ENV block at the top of this stage.
WORKDIR /app/apps/backend/.medusa/server
RUN pnpm install --prod --ignore-workspace --prefer-offline

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/.medusa/server ./

# Cloud Run injects PORT; medusa start honors it. 9000 for local runs.
EXPOSE 9000
CMD npx medusa start --port $PORT
