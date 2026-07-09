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
WORKDIR /app/apps/backend/.medusa/server
RUN pnpm install --prod --ignore-workspace

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/.medusa/server ./

# Cloud Run injects PORT; medusa start honors it. 9000 for local runs.
EXPOSE 9000
CMD npx medusa start --port $PORT
