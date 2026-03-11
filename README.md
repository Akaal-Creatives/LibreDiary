<p align="center">
  <img src="assets/logo.svg" alt="LibreDiary Logo" width="56" height="56">
</p>

<h1 align="center">LibreDiary</h1>

<p align="center">
  A self-hosted, local-first workspace for notes, docs, and databases.<br>
  Built for focus, designed for clarity, and always under your control.
</p>

<p align="center">
  <a href="https://github.com/Akaal-Creatives/LibreDiary/actions/workflows/ci.yml"><img src="https://github.com/Akaal-Creatives/LibreDiary/actions/workflows/ci.yml/badge.svg" alt="CI"></a>&nbsp;
  <a href="https://github.com/Akaal-Creatives/LibreDiary/actions/workflows/release.yml"><img src="https://github.com/Akaal-Creatives/LibreDiary/actions/workflows/release.yml/badge.svg" alt="Release"></a>&nbsp;
  <a href="https://github.com/Akaal-Creatives/LibreDiary/security/code-scanning"><img src="https://github.com/Akaal-Creatives/LibreDiary/actions/workflows/github-code-scanning/codeql/badge.svg" alt="CodeQL"></a>&nbsp;
  <a href="https://github.com/Akaal-Creatives/LibreDiary/pkgs/container/librediary-server"><img src="https://img.shields.io/badge/ghcr.io-librediary--server-blue?logo=docker" alt="Docker Image"></a>&nbsp;
  <a href="https://github.com/Akaal-Creatives/LibreDiary/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License"></a>
</p>

## Overview

LibreDiary is an open-source alternative to Notion, designed for complete data sovereignty. Unlike cloud-dependent tools, LibreDiary is engineered for self-hosting, ensuring your information remains private and accessible offline.

**Key Features:**

- Block-based editor powered by Tiptap
- Real-time collaboration with CRDT sync
- Multi-tenant organisation support
- Polymorphic storage (local, S3, MinIO) with provider migration
- Enterprise SSO with domain lockdown
- AI-powered content translation (31 languages via OpenRouter) with caching
- Hybrid search (Meilisearch + PostgreSQL FTS fallback) with faceted filtering
- Page version history with diff comparison
- Auto-delete trash after 30 days
- Guest share links with access tracking
- Time tracking with floating timer widget and time reports
- Onboarding wizard with getting started checklist
- KaTeX math blocks and markdown round-trip serialisation
- PWA support with offline viewing

## Tech Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | Vue 3, Vuestic UI, Tiptap, Pinia, Yjs             |
| Backend        | Node.js, Fastify, Hocuspocus, Prisma              |
| Database       | PostgreSQL                                        |
| Search         | Meilisearch (optional) / PostgreSQL FTS (default) |
| Infrastructure | pnpm, Turborepo, Docker                           |

## Development Milestones

### Foundation

- [x] **Phase 0: Project Setup** — Monorepo, TypeScript, ESLint, Docker
- [x] **Phase 1: Basic Editor & Server** — Fastify backend, Prisma ORM, Vue 3 frontend, Tiptap editor

### Core Features

- [x] **Phase 2: Authentication** — Email/password, OAuth (GitHub, Google), session management, password reset
- [x] **Phase 3: Multi-Tenancy** — Organisations, roles, invitations, domain lockdown, workspace switcher, super admin, setup wizard
- [x] **Phase 4: Page System** — CRUD, hierarchy, sidebar, breadcrumbs, icons, favourites, trash & restore
- [x] **Phase 5: Real-Time Collaboration** — Hocuspocus, Yjs, presence, cursors, page version history

### Advanced Features

- [x] **Phase 6: Sharing & Permissions** — Page-level permissions, public pages, share links with expiration
- [x] **Phase 7: Comments & Mentions** — Threaded comments, inline markers, @mentions with autocomplete
- [x] **Phase 8: Notifications** — In-app and email notifications with user preferences
- [x] **Phase 9: Search** — Hybrid search (Meilisearch + PG FTS fallback), faceted filtering, typo tolerance, admin reindex

### Data Management

- [x] **Phase 10: Databases** — Tables, Kanban, Calendar, Gallery views, relations, rollups, formulas, file attachments, time tracking with timer widget
- [x] **Phase 11: Templates** — Template library, create from page, categories, quick-start templates
- [x] **Phase 12: File Storage** — Local, MinIO, S3 storage providers, file type validation
- [x] **Phase 13: Backup System** — Per-org and system backups, encryption, scheduled backups, retention

### Platform

- [x] **Phase 14: API & Webhooks** — API tokens, Bearer auth, rate limiting, webhook delivery with HMAC signatures and retries
- [x] **Phase 15: Admin Features** — Audit logging, system settings, admin dashboard
- [x] **Phase 16: AI Features** — OpenRouter integration, content translation (31 languages), AI note writing, per-org and system-wide AI toggle
- [x] **Phase 17: Internationalization** — Multi-language UI support, vue-i18n, language switcher

### Compliance & Polish

- [x] **Phase 18: Editor Enhancements** — Slash commands, code blocks, callouts, toggles, drag & drop, KaTeX math blocks, superscript/subscript, markdown round-trip
- [x] **Phase 19: GDPR Compliance** — Data export, account deletion with 30-day grace period
- [x] **Phase 20: Production Ready** — Onboarding wizard, account settings, Docker deployment, documentation

### Integrations

- [x] **Phase 21: MCP Server** — Model Context Protocol server for managing LibreDiary from AI assistants (32 tools for pages, databases, search, files, organisations)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/librediary.git
cd librediary

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Start development services
docker compose up -d

# Run database migrations
pnpm db:push

# Start development servers
pnpm dev
```

## Documentation

| Guide                                      | Description                                          |
| ------------------------------------------ | ---------------------------------------------------- |
| [User Guide](docs/user-guide.md)           | Editor, pages, databases, collaboration, search, AI  |
| [Admin Guide](docs/admin-guide.md)         | Setup, user management, storage, backups, monitoring |
| [API Reference](docs/api-reference.md)     | All 95+ REST endpoints with auth and examples        |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions                          |
| [Deployment](docs/deployment.md)           | Docker production deployment                         |
| [Translating](docs/TRANSLATING.md)         | Contributing translations                            |

## Deployment

For production self-hosted deployment with Docker, see the [Deployment Guide](docs/deployment.md).

## Project Structure

```
librediary/
├── apps/
│   ├── server/     # Fastify backend API
│   └── web/        # Vue 3 frontend
├── packages/
│   ├── shared/     # Shared types, schemas, utilities
│   ├── tsconfig/   # TypeScript configurations
│   └── eslint-config/  # ESLint configurations
└── tooling/        # Build and dev tools
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

GNU AGPLv3 — Derivative works used as a service must share source code.

## Credits

Developed by [Akaal Creatives](https://www.akaalcreatives.com)

## Disclaimer

“Notion is a registered trademark of Notion Labs, Inc. This project is not affiliated with or endorsed by Notion.”
