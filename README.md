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

> [!WARNING]
> **Active Development** — LibreDiary is under active development and has not yet reached a stable release. APIs, database schemas, and configuration formats may change between versions without prior notice. You may encounter incomplete features, unexpected behaviour, or breaking changes when upgrading. We recommend pinning to a specific version in production and reviewing the [changelog](CHANGELOG.md) before updating. Bug reports and feedback are very welcome — please [open an issue](https://github.com/Akaal-Creatives/LibreDiary/issues) if something breaks.

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
- Mobile-optimised experience with bottom navigation and quick-capture mode

## Tech Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | Vue 3, Vuestic UI, Tiptap, Pinia, Yjs             |
| Backend        | Node.js, Fastify, Hocuspocus, Prisma              |
| Database       | PostgreSQL                                        |
| Search         | Meilisearch (optional) / PostgreSQL FTS (default) |
| Infrastructure | pnpm, Turborepo, Docker                           |

## Roadmap

See the full [Project Roadmap](PROJECT_ROADMAP.md) for development milestones and progress.

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

### Help us translate LibreDiary

> LibreDiary supports 16 languages. Initial translations were generated by [Claude](https://claude.ai) and **need native-speaker review** to ensure accuracy and natural phrasing.
>
> Whether you want to verify an existing translation or add a new language, see the [Translation Guide](docs/TRANSLATING.md) to get started.

## License

GNU AGPLv3 — Derivative works used as a service must share source code.

## Credits

Developed by [Akaal Creatives](https://www.akaalcreatives.com)

## Disclaimer

“Notion is a registered trademark of Notion Labs, Inc. This project is not affiliated with or endorsed by Notion.”
