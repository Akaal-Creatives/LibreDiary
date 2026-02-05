# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Custom dialog system with Alert and Confirm components
- Code of Conduct (Contributor Covenant 2.1)
- Security policy for vulnerability reporting
- Issue templates (bug report, feature request, documentation)
- Pull request template with CLA confirmation
- GitHub Actions CI workflow for PRs and main branch
- README status badges

### Fixed

- Context menu not responding to clicks
- Auto-delete empty untitled pages when navigating away
- Only set Content-Type header when body is present

## [0.1.0] - 2025-02-04

### Added

- Initial project setup with monorepo structure (pnpm + Turborepo)
- Vue 3 frontend with Vuestic UI and Tiptap editor
- Fastify backend with Prisma ORM
- PostgreSQL database integration
- Email/password authentication with session management
- Invite-only registration system
- Basic page editor functionality
- Dashboard with New Page action

[Unreleased]: https://github.com/akaalcreatives/librediary/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/akaalcreatives/librediary/releases/tag/v0.1.0
