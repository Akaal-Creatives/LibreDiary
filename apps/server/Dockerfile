# ===========================================
# LibreDiary Server - Production Dockerfile
# Multi-stage build for the Fastify API
#
# Build context: monorepo root (../../)
# Usage: docker build -f apps/server/Dockerfile .
#
# Developed by Akaal Creatives
# https://www.akaalcreatives.com
# ===========================================

# ------------------------------------------
# Stage 1: Base - Setup pnpm
# ------------------------------------------
FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# ------------------------------------------
# Stage 2: Dependencies - Install all deps
# ------------------------------------------
FROM base AS deps

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./

# Copy all workspace package.json files
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# ------------------------------------------
# Stage 3: Build - Compile TypeScript
# ------------------------------------------
FROM deps AS build

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/server/ apps/server/

# Generate Prisma client (dummy URL — generate only reads the schema, no connection needed)
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter @librediary/server db:generate

# Build shared package first, then server (turbo handles dependency order)
RUN pnpm turbo run build --filter=@librediary/server

# ------------------------------------------
# Stage 4: Runner - Production image
# ------------------------------------------
FROM node:20-slim AS runner

ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl dumb-init wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace root files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

# Install production dependencies only (ignore-scripts skips husky prepare hook)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Install tsx globally for runtime migrations and seed
RUN pnpm add -g tsx

# Copy built artefacts from build stage
COPY --from=build /app/apps/server/dist/ apps/server/dist/
COPY --from=build /app/apps/server/src/generated/ apps/server/src/generated/
COPY --from=build /app/apps/server/prisma/ apps/server/prisma/
COPY --from=build /app/apps/server/prisma.config.ts apps/server/prisma.config.ts
COPY --from=build /app/packages/shared/dist/ packages/shared/dist/

# Copy entrypoint script
COPY apps/server/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directories and fix permissions for node user
RUN mkdir -p /app/data/files /app/backups && \
    chown -R node:node /app/data /app/backups /app/node_modules/@prisma/engines

# Run as non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => { if (!r.ok) throw new Error(); }).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "apps/server/dist/index.js"]
