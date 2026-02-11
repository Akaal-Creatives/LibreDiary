# ===========================================
# LibreDiary Web - Production Dockerfile
# Multi-stage build for the Vue SPA
#
# Build context: monorepo root (../../)
# Usage: docker build -f apps/web/Dockerfile .
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
# Stage 2: Build - Install deps and compile
# ------------------------------------------
FROM base AS build

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./

# Copy all workspace package.json files
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/web/ apps/web/

# Build shared package first, then web (turbo handles dependency order)
RUN pnpm turbo run build --filter=@librediary/web

# ------------------------------------------
# Stage 3: Runner - Serve with nginx
# ------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built SPA files
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Copy SPA nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
