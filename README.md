<p align="center">
  <img src="assets/logo.svg" alt="LibreDiary Logo" width="56" height="56">
</p>

<h1 align="center">LibreDiary</h1>

<p align="center">
  A self-hosted, local-first workspace for notes, docs, and databases.<br>
  Built for focus, designed for clarity, and always under your control.
</p>

## Overview

LibreDiary is an open-source alternative to Notion, designed for complete data sovereignty. Unlike cloud-dependent tools, LibreDiary is engineered for self-hosting, ensuring your information remains private and accessible offline.

**Key Features:**

- Block-based editor powered by Tiptap
- Real-time collaboration with CRDT sync
- Multi-tenant organization support
- Polymorphic storage (local, S3, MinIO)
- Enterprise SSO with domain lockdown

## Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Frontend       | Vue 3, Vuestic UI, Tiptap, Pinia, Yjs |
| Backend        | Node.js, Fastify, Hocuspocus, Prisma  |
| Database       | PostgreSQL                            |
| Infrastructure | pnpm, Turborepo, Docker               |

## Development Milestones

### Foundation

- [x] **Phase 0: Project Setup** — Monorepo, TypeScript, ESLint, Docker
- [x] **Phase 1: Basic Editor & Server** — Fastify backend, Prisma ORM, Vue 3 frontend, Tiptap editor

### Core Features

- [x] **Phase 2: Authentication** — Email/password, session management, invite-only registration
- [ ] **Phase 3: Multi-Tenancy** — Organizations, roles, invitations, domain lockdown
- [ ] **Phase 4: Page System** — CRUD, hierarchy, sidebar, favorites, trash
- [ ] **Phase 5: Real-Time Collaboration** — Hocuspocus, Yjs, presence, cursors

### Advanced Features

- [ ] **Phase 6: Sharing & Permissions** — Page-level permissions, public pages, guest access
- [ ] **Phase 7: Comments & Mentions** — Threaded comments, @mentions
- [ ] **Phase 8: Notifications** — In-app and email notifications
- [ ] **Phase 9: Search** — Full-text search with PostgreSQL

### Data Management

- [ ] **Phase 10: Databases** — Tables, Kanban, Calendar, Gallery views
- [ ] **Phase 11: Templates** — Template library and quick-start templates
- [ ] **Phase 12: File Storage** — Local, MinIO, S3 storage providers
- [ ] **Phase 13: Backup System** — Automated encrypted backups

### Platform

- [ ] **Phase 14: API & Webhooks** — Public API, tokens, webhook system
- [ ] **Phase 15: Admin Features** — Audit logs, system settings, dashboard
- [ ] **Phase 16: AI Features** — Content translation via OpenRouter
- [ ] **Phase 17: Internationalization** — Multi-language UI support

### Compliance & Polish

- [ ] **Phase 18: GDPR Compliance** — Data export, account deletion
- [ ] **Phase 19: Editor Enhancements** — Slash commands, additional blocks, drag & drop
- [ ] **Phase 20: Production Ready** — Performance, accessibility, Docker deployment

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
