# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Move version display from sidebar to main content footer

### Internal

- Add git plugin to commit version bumps back to repo

## [1.5.2] - 2026-03-16

### Performance

- Lazy-load crypto module only when E2EE is needed

## [1.5.1] - 2026-03-16

### Fixed

- Resolve upload URLs against API origin for cross-origin deployments
- Add missing `common.saving` translation key

## [1.5.0] - 2026-03-16

### Added

- **End-to-end encryption**: Encrypt page `htmlContent` client-side before save and decrypt after load
- **End-to-end encryption**: Encrypt `yjsState` at rest for encrypted workspaces
- **End-to-end encryption**: Decrypt encrypted `yjsState` in version diffs
- **End-to-end encryption**: Encrypt file uploads and decrypt downloads for E2EE workspaces
- **End-to-end encryption**: Block public sharing for E2EE encrypted workspaces
- **End-to-end encryption**: Add audit logging to encryption routes
- `/version` endpoint and version display in sidebar

### Fixed

- Resolve TypeScript strict mode errors in E2EE tests and files store
- Use CMD-SHELL for Meilisearch healthcheck in Docker
- Resolve typecheck and test failures in CI pipeline

### Changed

- Migrate to Vite 8 with Rolldown build options

### Dependencies

- Bump Vite from 7.3.1 to 8.0.0
- Bump 21 production dependencies
- Bump 10 dev dependencies

## [1.4.1] - 2026-03-14

### Fixed

- Add rate limiting to encryption OTP verification endpoints

## [1.4.0] - 2026-03-14

### Changed

- **Database TableView refactor**: Extract `TableColumnHeader`, `TableRowDragCell`, `AddPropertyPopover`, and `TableBulkActions` sub-components

### Fixed

- Patch flatted unbounded recursion DoS vulnerability

## [1.3.1] - 2026-03-14

### Fixed

- Use dynamic host instead of hardcoded `librediary.app` in URL slug prefix
- Resolve CSRF token failure in cross-origin deployments
- Patch undici and file-type security vulnerabilities

### Changed

- Extract composables from `TableView.vue`

## [1.3.0] - 2026-03-12

### Added

- **Internationalisation**: Translations for all 16 supported languages
- **MCP Server**: User profile tool, patch method, and setup documentation
- **Account settings**: Profile, email, and password management page
- Change email endpoint with password verification
- Change password endpoint for authenticated users

### Fixed

- Resolve TypeScript strict mode errors across server and web
- Derive WebSocket URL from `VITE_API_URL`
- Tighten Content-Security-Policy for API responses
- Add CSRF token validation for cross-origin deployment
- Validate `X-Forwarded-For` against trusted proxies
- Add progressive login lockout and rate limiting
- Add rate limiting to invite token lookup and resend-verification
- Resolve pre-existing CI failures in crypto tests and admin translations
- Make invite email sending non-blocking
- Prepend `APP_URL` to local storage upload URLs
- Patch 4 Dependabot security vulnerabilities
- Add per-type Zod validation for database property config
- Sanitise KaTeX and Mermaid innerHTML output with DOMPurify
- Address audit findings across editor, timer, and time report

### Dependencies

- Bump 27 production dependencies

## [1.2.0] - 2026-03-10

### Added

- **End-to-end encryption (E2EE)**: Complete cryptographic foundation with AES-256-GCM symmetric encryption, Argon2id key derivation, X25519 key exchange, AES-256-KW key wrapping, and recovery keys
- **E2EE UI**: Enable/disable encryption with OTP verification, recovery key display, key sharing management, grant access button for workspace members
- **E2EE server**: Encryption schema models, server APIs, scheduled purge for expired grace periods, skip plaintext processing and search indexing for encrypted workspaces
- **E2EE client**: Client-side encryption service and composable, client-side search with MiniSearch, UI/UX indicators for encrypted workspaces
- **Editor**: KaTeX math block extension with LaTeX rendering, superscript and subscript marks, H4-H6 heading levels with slash commands and TOC support, markdown round-trip serialisation for all custom extensions
- **Onboarding**: Onboarding wizard page with route and navigation guard, `onboardingCompletedAt` field and PATCH endpoint
- **Dashboard**: Getting Started checklist widget
- **Templates**: Built-in starter templates with Yjs state generation
- **Database**: Duration property type with formatting utilities, duration cell renderer/editor and property config, timer controls for database rows and duration cells, time reports panel with summary, per-user breakdown, and CSV export
- **Timer**: `useTimer` composable and floating TimerWidget component
- Super admin seeder with random password and webhook
- Logout button to app sidebar footer

### Fixed

- Use rejection sampling for OTP generation
- Grant super admin role to demo user

### Dependencies

- Bump 3 dev dependencies
- Bump docker/metadata-action from 5 to 6

## [1.1.4] - 2026-03-06

### Fixed

- Patch fastify and dompurify security vulnerabilities

## [1.1.3] - 2026-03-06

### Fixed

- Add `--accept-data-loss` to Prisma db push in Docker entrypoint

## [1.1.2] - 2026-03-05

### Fixed

- Correct CodeQL badge path and version badge endpoint

### Documentation

- Add Release, CodeQL, version, and Docker status badges to README

## [1.1.1] - 2026-03-05

### Fixed

- Use `fastify-plugin` to apply CORS headers globally

## [1.1.0] - 2026-03-05

### Added

- Construct `DATABASE_URL` from `POSTGRES_*` environment variables in Docker

## [1.0.7] - 2026-03-05

### Fixed

- Increase timing tolerance in account deletion date test
- Resolve Docker container startup failures
- Grant node user write access to Prisma engines directory

## [1.0.6] - 2026-03-05

### Fixed

- Correct email domain and seed demo data on startup

### Changed

- Move Docker build and deploy into Release workflow

## [1.0.5] - 2026-03-05

### Fixed

- Build multi-platform Docker images for amd64 and arm64

## [1.0.4] - 2026-03-05

### Fixed

- Address CodeQL code scanning alerts

## [1.0.3] - 2026-03-05

### Fixed

- Patch hono, @hono/node-server, and tar vulnerabilities

## [1.0.2] - 2026-03-05

### Fixed

- Use `VPS_APP_PATH` secret instead of hardcoded path

### Changed

- Migrate ESLint to v9 flat config

### Dependencies

- Bump rollup-plugin-visualizer from 6.0.5 to 7.0.0
- Bump 23 production dependencies
- Bump 9 dev dependencies

## [1.0.1] - 2026-03-04

### Fixed

- Provide dummy `DATABASE_URL` for Prisma client generation in Docker

## [1.0.0] - 2026-03-04

### Added

- **Project foundation**: Monorepo with pnpm + Turborepo, Vue 3 frontend, Fastify backend, PostgreSQL with Prisma ORM
- **Authentication**: Email/password with session management, OAuth integration (GitHub, Google), invite-only registration, progressive login lockout
- **Multi-tenancy**: Organisation management with member roles, multiple domain lockdown, organisation switcher
- **Page system**: Rich text editor with Tiptap, page tree with drag-and-drop reordering, page cover images, favourites with drag-and-drop, auto-delete empty untitled pages
- **Real-time collaboration**: Hocuspocus WebSocket server, collaborative editing with cursor positions, version history with restore
- **Page sharing & permissions**: Share links with guest access, public page view
- **Comments & mentions**: Threaded comments with sidebar panel, @mention system
- **Notifications**: Notification system with email integration, notification preferences and settings page
- **Search**: PostgreSQL full-text search, hybrid Meilisearch/PG FTS search, search modal with Cmd+K shortcut, typo tolerance and faceted search
- **Database**: Full database system with table, kanban, calendar (month/week/day), and gallery views; property types including text, number, select, multi-select, date, checkbox, URL, email, person, relation, rollup, formula, files, and duration; column resizing, bulk actions, drag-and-drop, database templates
- **Templates**: Template library with save-as-template flow, built-in starter templates
- **File storage**: Local and S3 storage providers, multipart upload with progress tracking, admin storage settings
- **Backup system**: Automated and manual backups, backup restoration, per-organisation backup management
- **API & webhooks**: API token management, webhook system with delivery tracking
- **Admin panel**: Super admin dashboard with system health, audit logging, system settings, user and organisation management
- **AI integration**: OpenRouter client, content translation with bubble menu, AI writing assistance with bubble menu
- **Internationalisation**: vue-i18n integration, community translations for 16 languages
- **Editor extensions**: Slash commands, code blocks, callouts, toggle blocks, table of contents, drag handle, CommonMark and GFM Markdown support
- **Performance**: Lazy-loaded modals, vendor chunk splitting, compression, in-memory TTL caching, composite database indexes, stale-while-revalidate cache
- **Accessibility**: ARIA labels, skip-to-content link, reduced motion support, keyboard navigation, axe-core test suite
- **PWA**: Service worker for offline viewing with Workbox
- **GDPR**: Data export and account deletion
- **Security**: Rate limiting, CSRF protection, Content-Security-Policy, path traversal protection, DOMPurify sanitisation, MIME validation, secure file uploads
- **Docker**: Production Docker infrastructure with multi-platform images, CI/CD deployment workflows, demo mode
- **MCP Server**: AI assistant integration package with comprehensive unit tests
- **CI/CD**: GitHub Actions workflows, semantic release, Dependabot configuration

[Unreleased]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.5.2...HEAD
[1.5.2]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.1.4...v1.2.0
[1.1.4]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.7...v1.1.0
[1.0.7]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Akaal-Creatives/LibreDiary/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Akaal-Creatives/LibreDiary/releases/tag/v1.0.0
