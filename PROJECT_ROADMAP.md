# LibreDiary Project Roadmap

## 1. Project Overview

LibreDiary is an open-source, self-hosted, local-first workspace platform (Notion alternative) with block-based editing, real-time collaboration, and multi-tenant support.

## 2. Core Philosophy

- **Self-Hosted**: Users maintain full control over their infrastructure
- **Local-First**: Application functional offline (cached viewing), syncs via CRDTs
- **Data Sovereignty**: No third-party data access; 100% free
- **Multi-Tenant**: Single instance supports multiple isolated organizations

## 3. Technical Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| **Frontend** | Vue 3 (Composition API), Vuestic UI, Tiptap, Pinia, Yjs |
| **Backend**  | Node.js, Fastify, Hocuspocus, Prisma, Better Auth       |
| **Database** | PostgreSQL (FTS), Meilisearch (Phase 2)                 |
| **Storage**  | Local/MinIO/S3, Backblaze B2 (backups)                  |
| **AI**       | OpenRouter (translation, content creation, scheduling)  |
| **Infra**    | pnpm, Turborepo, Docker                                 |

---

## Phase 0: Project Setup

### 0.1 Development Environment

- [x] Initialize pnpm monorepo with Turborepo
- [x] Configure workspaces: `apps/`, `packages/`
- [x] Setup TypeScript base configuration
- [x] Configure ESLint + Prettier
- [x] Setup Husky + lint-staged for pre-commit hooks
- [x] Create `.env.example` with all variables
- [x] Setup Docker Compose for local development (PostgreSQL)

### 0.2 Shared Package (`packages/shared`)

- [x] Create package structure with tsup build
- [x] Define TypeScript types (User, Org, Page, etc.)
- [x] Create Zod validation schemas
- [x] Add utility functions (slugify, formatDate, etc.)
- [x] Export API response types

### 0.3 Documentation

- [x] Create CONTRIBUTING.md
- [x] Create development setup guide
- [x] Document environment variables

---

## Phase 1: Foundation - Basic Editor & Server

### 1.1 Backend Server Setup (`apps/server`)

- [x] Initialize Fastify with TypeScript
- [x] Configure CORS, Helmet, Cookie plugins
- [x] Setup Pino logger
- [x] Create environment validation (Zod)
- [x] Add health check endpoint (`/health`)
- [x] Add developer attribution endpoint (`/dev`)
- [x] Setup basic error handling middleware

### 1.2 Database Setup

- [x] Initialize Prisma with PostgreSQL
- [x] Create User model (id, email, name, passwordHash, etc.)
- [x] Create Organization model
- [x] Create OrganizationMember model with roles
- [x] Create Page model with hierarchy
- [x] Create initial migration
- [x] Seed super admin user

### 1.3 Frontend Setup (`apps/web`)

- [x] Initialize Vue 3 + Vite project
- [x] Configure Vuestic UI with color presets
- [x] Setup Vue Router with route guards
- [x] Setup Pinia stores (auth, pages)
- [x] Create basic layout components
- [x] Create home/landing page
- [x] Create 404 page

### 1.4 Basic Tiptap Editor

- [x] Install Tiptap with starter-kit
- [x] Create Editor component wrapper
- [x] Add basic blocks: Paragraph, Heading (1-3), List
- [x] Implement markdown shortcuts
- [x] Add placeholder text
- [x] Style editor with Vuestic theme colors

---

## Phase 2: Authentication (Backend)

### 2.1 Email/Password Auth

- [x] Create auth routes (register, login, logout)
- [x] Implement password hashing (Argon2)
- [x] Create session management (cookies)
- [x] Add session table in Prisma
- [x] Implement auth middleware
- [x] Create login page (frontend)
- [x] Create registration page (invite-only) (frontend)
- [x] Add form validation with Zod schemas

### 2.2 Email Verification

- [x] Create VerificationToken model
- [x] Implement email sending service (SMTP)
- [x] Create verification email template
- [x] Add verify-email endpoint
- [x] Create email verification page (frontend)

### 2.3 Password Reset

- [x] Create password reset token flow
- [x] Create reset email template
- [x] Add forgot-password endpoint
- [x] Add reset-password endpoint
- [x] Create forgot password page (frontend)
- [x] Create reset password page (frontend)

### 2.4 OAuth Integration

- [x] Install Better Auth + Arctic
- [x] Configure GitHub OAuth provider
- [x] Configure Google OAuth provider
- [x] Create Account model for OAuth links
- [x] Handle OAuth callback routing
- [x] Link OAuth accounts to existing users

### 2.5 Session Management

- [x] Add session listing endpoint
- [x] Add session revocation endpoint
- [x] Create sessions management UI (frontend)
- [x] Track last active time, IP, user agent

---

## Phase 3: Multi-Tenancy & Organizations

### 3.1 Organization Management

- [x] Create organization CRUD endpoints
- [x] Implement organization slug validation
- [x] Add organization settings (name, logo, accent color)
- [x] Create organization settings page
- [x] Implement logo upload

### 3.2 Membership & Roles

- [x] Define role hierarchy (Owner, Admin, Member)
- [x] Create membership management endpoints
- [x] Implement role-based authorization middleware
- [x] Create members list UI
- [x] Create role change UI

### 3.3 Invitation System

- [x] Create Invitation model
- [x] Generate secure invitation tokens
- [x] Create invite email template
- [x] Add invite endpoint
- [x] Create invitation acceptance flow
- [x] Add invitation management UI

### 3.4 Domain Lockdown

- [x] Add allowedDomain field to Organization
- [x] Validate email domain on registration
- [x] Add domain configuration UI

### 3.5 Workspace Switcher

- [x] Fetch user's organization memberships
- [x] Create workspace switcher dropdown
- [x] Persist selected workspace in localStorage
- [x] Update API calls with organization context

### 3.6 Super Admin

- [x] Create isSuperAdmin flag on User
- [x] Create super admin middleware
- [x] Create admin dashboard layout
- [x] Add system-wide user management
- [x] Add system-wide organization management

### 3.7 Setup Wizard

- [x] Detect first-run state (no super admin)
- [x] Create setup wizard pages
- [x] Collect super admin credentials
- [x] Create first organization
- [x] Initialize system settings

---

## Phase 4: Page System

### 4.1 Page CRUD

- [x] Create page endpoints (create, read, update, delete)
- [x] Implement soft delete (trashedAt)
- [x] Add organization scope to all queries
- [x] Implement page loading in frontend
- [x] Create page title editing
- [x] Auto-save page title changes

### 4.2 Page Hierarchy

- [x] Implement parent-child relationships
- [x] Create recursive page tree query
- [x] Implement position ordering for siblings
- [x] Add move page endpoint
- [x] Create drag-drop reordering UI

### 4.3 Sidebar Navigation

- [x] Create recursive page tree component
- [x] Add expand/collapse functionality
- [x] Implement page creation from sidebar
- [x] Add context menu (rename, delete, duplicate)
- [x] Highlight active page

### 4.4 Breadcrumbs

- [x] Create breadcrumb component
- [x] Fetch page path (ancestors)
- [x] Navigate on breadcrumb click

### 4.5 Page Icons & Covers

- [x] Add icon field to Page model
- [x] Create emoji picker component
- [x] Implement icon selection UI
- [x] Add coverUrl field to Page
- [x] Create cover image upload
- [x] Display cover in page header

### 4.6 Favorites

- [x] Create Favorite model
- [x] Add toggle favorite endpoint
- [x] Create favorites section in sidebar
- [x] Implement favorite reordering

### 4.7 Trash & Restore

- [x] Create trash listing endpoint
- [x] Add restore endpoint
- [x] Add permanent delete endpoint
- [x] Create trash page UI
- [ ] Implement auto-delete after 30 days (cron job - future enhancement)

---

## Phase 5: Real-Time Collaboration

### 5.1 Hocuspocus Setup

- [x] Install @hocuspocus/server
- [x] Create Hocuspocus server configuration
- [x] Implement onAuthenticate hook (verify session)
- [x] Implement onLoadDocument hook (load from DB)
- [x] Implement onStoreDocument hook (save to DB)
- [x] Setup WebSocket route (/collaboration/:pageId)

### 5.2 Yjs Integration

- [x] Install y-websocket provider
- [x] Create Y.Doc per page
- [x] Store yjsState as Bytes in Page model
- [x] Connect Tiptap to Yjs document (frontend)
- [x] Test multi-user editing

### 5.3 Presence & Cursors

- [x] Enable Yjs awareness
- [x] Create presence indicator component (frontend)
- [x] Show user avatars viewing page (frontend)
- [x] Install @tiptap/extension-collaboration-cursor (frontend)
- [x] Display remote cursors with user colors (backend support)
- [x] Show user name tooltips on cursors (backend support)

### 5.4 Page Version History

- [x] Create PageVersion model
- [x] Save version on significant changes (via API endpoint)
- [x] Create version listing endpoint
- [x] Create restore version endpoint
- [x] Create version history UI (frontend)
- [ ] Implement version diff view (optional)

---

## Phase 6: Page Sharing & Permissions

### 6.1 Page-Level Permissions

- [x] Create PagePermission model
- [x] Define permission levels (View, Edit, Full Access)
- [x] Create permission check middleware
- [x] Integrate permissions into Hocuspocus auth hook

### 6.2 Share UI

- [x] Create share modal component
- [x] List current permissions
- [x] Add user to page with permission level
- [x] Remove user permission
- [x] Update permission level

### 6.3 Public Pages

- [x] Add isPublic and publicSlug fields
- [x] Generate unique public slug
- [x] Create public page route (/public/:slug)
- [x] Create public page viewer (read-only)
- [x] Add share to web toggle in share modal

### 6.4 Guest Access

- [x] Create share token system (via PagePermission model)
- [x] Generate guest access tokens
- [x] Create share link page (/share/:token)
- [x] Add expiration for guest links
- [ ] Track guest last access (optional enhancement)

---

## Phase 7: Comments & Mentions

### 7.1 Comments System

- [x] Create Comment model with threading
- [x] Create comment CRUD endpoints
- [x] Implement blockId reference for inline comments
- [x] Create comments sidebar component
- [x] Create inline comment markers in editor

### 7.2 Comment UI

- [x] Display comment threads
- [x] Add reply functionality
- [x] Implement resolve/unresolve
- [x] Add comment editing
- [x] Add comment deletion

### 7.3 Mentions

- [x] Create Mention model
- [x] Implement @mention detection in comment input
- [x] Create user autocomplete dropdown
- [x] Store mentions when comment saved
- [x] Link mentions to notifications (Phase 8)

---

## Phase 8: Notifications

### 8.1 Notification System

- [x] Create Notification model
- [x] Define notification types (mention, comment, share, etc.)
- [x] Create notification service
- [x] Trigger notifications on relevant events

### 8.2 In-App Notifications

- [x] Create notification listing endpoint
- [x] Create mark-as-read endpoint
- [x] Create notification bell component
- [x] Create notification dropdown
- [x] Show unread count badge

### 8.3 Email Notifications

- [x] Create email notification templates
- [x] Implement email sending for important events
- [x] Add emailSent tracking
- [x] Create notification preferences endpoint
- [x] Create notification settings UI

---

## Phase 9: Search

### 9.1 PostgreSQL Full-Text Search

- [x] Add tsvector column to Page
- [x] Create search index trigger
- [x] Create search endpoint
- [x] Implement search query parsing
- [x] Create search UI with results

### 9.2 Search Enhancements

- [x] Add search filters (type, date, author)
- [x] Implement search highlighting
- [x] Add recent searches
- [x] Create global search shortcut (Cmd+K)

### 9.3 Meilisearch Integration (Future)

- [ ] Setup Meilisearch Docker service
- [ ] Create Meilisearch client
- [ ] Index pages on create/update
- [ ] Remove from index on delete
- [ ] Switch search endpoint to Meilisearch
- [ ] Add typo tolerance and facets

---

## Phase 10: Databases (Tables)

### 10.1 Database Models

- [x] Create Database model
- [x] Create DatabaseProperty model with types
- [x] Create DatabaseRow model
- [x] Create DatabaseCell model (JSON value)
- [x] Create DatabaseView model

### 10.2 Database CRUD

- [x] Create database endpoints
- [x] Create property management endpoints
- [x] Create row CRUD endpoints
- [x] Create view management endpoints

### 10.3 Table View

- [x] Create data table component
- [x] Implement column resizing
- [x] Add cell editing by type
- [x] Implement sorting
- [x] Implement filtering

### 10.4 Property Types

- [x] Implement Text property
- [x] Implement Number property
- [x] Implement Select/Multi-select properties
- [x] Implement Date property
- [x] Implement Checkbox property
- [x] Implement URL/Email/Phone properties
- [x] Implement Person property (user reference)
- [x] Implement Files property

### 10.5 Kanban View

- [x] Create kanban board component
- [x] Group rows by select property
- [x] Implement drag-drop between columns
- [x] Add column management

### 10.6 Calendar View

- [x] Create calendar component
- [x] Display rows by date property
- [x] Implement month view
- [x] Add drag to reschedule
- [x] Implement week view
- [x] Implement day view

### 10.7 Gallery View

- [x] Create gallery grid component
- [x] Display row cards with cover image
- [x] Implement card layout options

### 10.8 Advanced Features

- [x] Implement Relations between databases
- [x] Implement Rollup calculations
- [x] Implement Formula properties
- [x] Add database templates

---

## Phase 11: Templates

### 11.1 Template System

- [x] Create Template model
- [x] Create template CRUD endpoints
- [x] Store template content as Yjs state

### 11.2 Template Management

- [x] Create template library page
- [x] Create template from page
- [x] Implement template categories
- [x] Add template search

### 11.3 Template Usage

- [x] Create page from template endpoint
- [x] Add "Use template" in new page flow
- [x] Create quick-start templates

---

## Phase 12: File Storage

### 12.1 Storage Service

- [x] Create storage service interface
- [x] Implement local disk storage
- [x] Implement MinIO storage (skeleton)
- [x] Implement S3 storage (skeleton)
- [x] Create file upload endpoint
- [x] Create file download endpoint

### 12.2 File Management

- [x] Create File model
- [x] Track file metadata (size, type)
- [x] Implement file type validation
- [x] Implement file size limits
- [x] Create file deletion

### 12.3 Admin Storage Config

- [x] Create storage settings UI
- [x] Validate storage credentials
- [ ] Migrate between storage providers (optional)

---

## Phase 13: Backup System (Take Your Data)

### 13.1 Per-Organisation Backup

- [x] Create Backup model (BackupType, BackupStatus enums)
- [x] Implement per-organisation data export (pages, databases, files)
- [x] Compress backups (tar.gz)
- [x] Encrypt backups (AES-256-GCM with PBKDF2)
- [x] Pluggable backup storage (Local disk / S3-compatible / Backblaze B2)
- [x] Create downloadable backup archive per organisation

### 13.2 System Backup (pg_dump)

- [x] Implement pg_dump automation (via execFile, no shell injection)
- [x] Implement scheduled backups (node-cron)
- [x] Create manual backup trigger
- [x] Implement backup retention cleanup
- [ ] Implement backup restoration (future enhancement)

### 13.3 Backup Management

- [x] Create backup listing endpoints (admin + org)
- [x] Create admin backup management page
- [x] Create backup settings summary in admin settings
- [x] Create organisation backup management page
- [x] Allow organisation admins to trigger their own backups
- [x] Allow organisation admins to download their backup archives

---

## Phase 14: API & Webhooks

### 14.1 Public API

- [x] Create API token model (SHA-256 hashed, `ld_` prefix)
- [x] Implement token generation (cryptographically secure, shown once)
- [x] Create API authentication middleware (Bearer token with session fallback)
- [ ] Document API endpoints (future enhancement)
- [x] Add rate limiting per token

### 14.2 API Token Management

- [x] Create token listing endpoint
- [x] Create token revocation
- [x] Create API tokens UI
- [x] Track token last used

### 14.3 Webhooks

- [x] Create Webhook model
- [x] Create WebhookDelivery model
- [x] Implement webhook triggering service (fire-and-forget integration)
- [x] Add webhook signature verification (HMAC-SHA256)
- [x] Implement retry logic (exponential backoff, 3 attempts)

### 14.4 Webhook Management

- [x] Create webhook CRUD endpoints
- [x] Create webhooks management UI (with event categories)
- [x] Display delivery logs
- [x] Test webhook delivery

---

## Phase 15: Admin Features

### 15.1 Audit Logging

- [x] Create AuditLog model with AuditAction enum (50+ action types)
- [x] Implement audit logging service (fire-and-forget pattern)
- [x] Log user actions across all modules (auth, pages, comments, permissions, organisations, admin, databases, backups, api-tokens, webhooks, templates)
- [x] Create audit log viewing endpoints (paginated, filtered, enriched)
- [x] Create audit logs admin page with action filter, pagination, and table view

### 15.2 System Settings

- [x] Extend SystemSettings model with runtime-configurable fields
- [x] Create settings service (getSettings, updateSettings)
- [x] Create GET/PATCH /admin/settings endpoints with Zod validation
- [x] Create admin settings page (General section with editable form)
- [x] Frontend service functions (getSystemSettings, updateSystemSettings)

### 15.3 Admin Dashboard

- [x] Create system stats endpoints
- [x] Display user/org/page counts
- [x] Show storage usage
- [x] Show system health status

---

## Phase 16: AI Features

### 16.1 OpenRouter Integration

- [x] Create OpenRouter client
- [x] Implement API key configuration
- [x] Add AI enabled toggle

### 16.2 Content Translation

- [x] Create translation endpoint
- [x] Implement translation UI (bubble menu)
- [x] Support multiple target languages (31 languages)
- [ ] Cache translations (optional)

### 16.3 AI-Assisted Content Creation

- [x] AI note writing (generate, expand, summarise, improve text)
- [ ] AI database creation (generate schema and sample rows from description)
- [ ] AI schedule generation (create schedules from natural language input)
- [ ] AI to-do creation (generate task lists from goals or descriptions)
- [x] Gated behind OpenRouter API key configuration and AI enabled toggle

### 16.4 AI Toggle

- [x] Add aiEnabled to Organization
- [x] Add global AI disable in SystemSettings
- [x] Hide AI features when disabled

---

## Phase 17: Internationalization

### 17.1 UI Translation

- [x] Setup vue-i18n
- [x] Extract UI strings to locale files
- [x] Create English locale (en-GB.json, en-US.json)
- [x] Create language switcher
- [x] Persist language preference

### 17.2 Community Translations

- [x] Document translation contribution process
- [x] Add locale files for common languages
- [x] Create translation status page

---

## Phase 18: Editor Enhancements

### 18.1 Slash Commands

- [ ] Create slash command extension
- [ ] Build command menu component
- [ ] Add block type commands
- [ ] Add keyboard navigation

### 18.2 Additional Block Types

- [ ] Add Code block with syntax highlighting
- [ ] Add Quote block
- [ ] Add Callout/Alert block
- [ ] Add Divider block
- [ ] Add Table of Contents block
- [ ] Add Toggle/Collapsible block

### 18.3 Drag & Drop

- [ ] Implement block drag handles
- [ ] Add drop indicators
- [ ] Reorder blocks via drag
- [ ] Move blocks between pages (optional)

---

## Phase 19: Compliance

### 19.1 GDPR - Data Export

- [ ] Create user data export endpoint
- [ ] Export user's pages, comments, files
- [ ] Generate downloadable archive
- [ ] Create data export UI

### 19.2 GDPR - Account Deletion

- [ ] Create account deletion endpoint
- [ ] Implement cascading deletes
- [ ] Add deletion confirmation flow
- [ ] Remove from all organizations

---

## Phase 20: Polish & Distribution

### 20.1 UI/UX Polish

- [ ] Implement dark/light mode toggle
- [ ] Add loading skeletons
- [ ] Add keyboard shortcuts
- [ ] Improve mobile responsiveness
- [ ] Add onboarding tour

### 20.2 Performance

- [ ] Add API response caching
- [ ] Implement lazy loading
- [ ] Optimize database queries
- [ ] Add service worker for offline viewing

### 20.3 Accessibility

- [ ] Audit for WCAG 2.1 AA
- [ ] Add ARIA labels
- [ ] Ensure keyboard navigation
- [ ] Test with screen readers

### 20.4 Production Docker

- [ ] Create production Dockerfile
- [ ] Create docker-compose.production.yml
- [ ] Add health checks
- [ ] Document deployment process

### 20.5 Documentation

- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] Create API documentation
- [ ] Create troubleshooting guide

---

## Future Phases

### Embeds (Requires Security Review)

- [ ] Design embed sandbox strategy
- [ ] Implement YouTube embed
- [ ] Implement Figma embed
- [ ] Implement Google Maps embed
- [ ] Implement generic oEmbed support

### Import/Export

- [ ] Import from Notion
- [ ] Import from Markdown files
- [ ] Export to Markdown
- [ ] Export to PDF

### Mobile Apps

- [ ] Create PWA manifest
- [ ] Implement service worker
- [ ] Design mobile-optimized views
- [ ] Plan native app (React Native OR CapacitorJS)

---

## 4. Developer Attribution

- **Developer**: Akaal Creatives
- **Website**: https://www.akaalcreatives.com

All deployments must include visible attribution and the `/dev` API endpoint.

## 5. License

GNU AGPLv3 - Derivative works used as a service must share source code.
