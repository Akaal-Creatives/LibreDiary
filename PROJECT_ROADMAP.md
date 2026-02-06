# LibreDiary Project Roadmap

> **Status Legend:** ⬜ Not Started | 🟡 In Progress | ✅ Completed | ⏸️ Blocked

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
| **AI**       | OpenRouter (content translation)                        |
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

## Phase 2: Authentication (Backend ✅)

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

## Phase 3: Multi-Tenancy & Organizations ✅

### 3.1 Organization Management

- [x] Create organization CRUD endpoints
- [x] Implement organization slug validation
- [x] Add organization settings (name, logo, accent color)
- [x] Create organization settings page
- [ ] Implement logo upload

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

### 3.6 Super Admin ✅

- [x] Create isSuperAdmin flag on User
- [x] Create super admin middleware
- [x] Create admin dashboard layout
- [x] Add system-wide user management
- [x] Add system-wide organization management

### 3.7 Setup Wizard ✅

- [x] Detect first-run state (no super admin)
- [x] Create setup wizard pages
- [x] Collect super admin credentials
- [x] Create first organization
- [x] Initialize system settings

---

## Phase 4: Page System ✅

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
- [ ] Create cover image upload (deferred to Phase 12: File Storage)
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

## Phase 5: Real-Time Collaboration ✅

### 5.1 Hocuspocus Setup ✅

- [x] Install @hocuspocus/server
- [x] Create Hocuspocus server configuration
- [x] Implement onAuthenticate hook (verify session)
- [x] Implement onLoadDocument hook (load from DB)
- [x] Implement onStoreDocument hook (save to DB)
- [x] Setup WebSocket route (/collaboration/:pageId)

### 5.2 Yjs Integration ✅

- [x] Install y-websocket provider
- [x] Create Y.Doc per page
- [x] Store yjsState as Bytes in Page model
- [x] Connect Tiptap to Yjs document (frontend)
- [x] Test multi-user editing

### 5.3 Presence & Cursors ✅

- [x] Enable Yjs awareness
- [x] Create presence indicator component (frontend)
- [x] Show user avatars viewing page (frontend)
- [x] Install @tiptap/extension-collaboration-cursor (frontend)
- [x] Display remote cursors with user colors (backend support)
- [x] Show user name tooltips on cursors (backend support)

### 5.4 Page Version History ✅

- [x] Create PageVersion model
- [x] Save version on significant changes (via API endpoint)
- [x] Create version listing endpoint
- [x] Create restore version endpoint
- [x] Create version history UI (frontend)
- [ ] Implement version diff view (optional)

---

## Phase 6: Page Sharing & Permissions

### 6.1 Page-Level Permissions

- [ ] Create PagePermission model
- [ ] Define permission levels (View, Edit, Full Access)
- [ ] Create permission check middleware
- [ ] Integrate permissions into Hocuspocus auth hook

### 6.2 Share UI

- [ ] Create share modal component
- [ ] List current permissions
- [ ] Add user to page with permission level
- [ ] Remove user permission
- [ ] Update permission level

### 6.3 Public Pages

- [ ] Add isPublic and publicSlug fields
- [ ] Generate unique public slug
- [ ] Create public page route (/public/:slug)
- [ ] Create public page viewer (read-only)
- [ ] Add share to web toggle in share modal

### 6.4 Guest Access

- [ ] Create GuestAccess model
- [ ] Generate guest access tokens
- [ ] Create guest login page
- [ ] Track guest last access
- [ ] Add expiration for guest links

---

## Phase 7: Comments & Mentions

### 7.1 Comments System

- [ ] Create Comment model with threading
- [ ] Create comment CRUD endpoints
- [ ] Implement blockId reference for inline comments
- [ ] Create comments sidebar component
- [ ] Create inline comment markers in editor

### 7.2 Comment UI

- [ ] Display comment threads
- [ ] Add reply functionality
- [ ] Implement resolve/unresolve
- [ ] Add comment editing
- [ ] Add comment deletion

### 7.3 Mentions

- [ ] Create Mention model
- [ ] Implement @mention detection in comment input
- [ ] Create user autocomplete dropdown
- [ ] Store mentions when comment saved
- [ ] Link mentions to notifications

---

## Phase 8: Notifications

### 8.1 Notification System

- [ ] Create Notification model
- [ ] Define notification types (mention, comment, share, etc.)
- [ ] Create notification service
- [ ] Trigger notifications on relevant events

### 8.2 In-App Notifications

- [ ] Create notification listing endpoint
- [ ] Create mark-as-read endpoint
- [ ] Create notification bell component
- [ ] Create notification dropdown
- [ ] Show unread count badge

### 8.3 Email Notifications

- [ ] Create email notification templates
- [ ] Implement email sending for important events
- [ ] Add emailSent tracking
- [ ] Create notification preferences endpoint
- [ ] Create notification settings UI

---

## Phase 9: Search

### 9.1 PostgreSQL Full-Text Search

- [ ] Add tsvector column to Page
- [ ] Create search index trigger
- [ ] Create search endpoint
- [ ] Implement search query parsing
- [ ] Create search UI with results

### 9.2 Search Enhancements

- [ ] Add search filters (type, date, author)
- [ ] Implement search highlighting
- [ ] Add recent searches
- [ ] Create global search shortcut (Cmd+K)

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

- [ ] Create Database model
- [ ] Create DatabaseProperty model with types
- [ ] Create DatabaseRow model
- [ ] Create DatabaseCell model (JSON value)
- [ ] Create DatabaseView model

### 10.2 Database CRUD

- [ ] Create database endpoints
- [ ] Create property management endpoints
- [ ] Create row CRUD endpoints
- [ ] Create view management endpoints

### 10.3 Table View

- [ ] Create data table component
- [ ] Implement column resizing
- [ ] Add cell editing by type
- [ ] Implement sorting
- [ ] Implement filtering

### 10.4 Property Types

- [ ] Implement Text property
- [ ] Implement Number property
- [ ] Implement Select/Multi-select properties
- [ ] Implement Date property
- [ ] Implement Checkbox property
- [ ] Implement URL/Email/Phone properties
- [ ] Implement Person property (user reference)
- [ ] Implement Files property

### 10.5 Kanban View

- [ ] Create kanban board component
- [ ] Group rows by select property
- [ ] Implement drag-drop between columns
- [ ] Add column management

### 10.6 Calendar View

- [ ] Create calendar component
- [ ] Display rows by date property
- [ ] Implement month/week/day views
- [ ] Add drag to reschedule

### 10.7 Gallery View

- [ ] Create gallery grid component
- [ ] Display row cards with cover image
- [ ] Implement card layout options

### 10.8 Advanced Features

- [ ] Implement Relations between databases
- [ ] Implement Rollup calculations
- [ ] Implement Formula properties
- [ ] Add database templates

---

## Phase 11: Templates

### 11.1 Template System

- [ ] Create Template model
- [ ] Create template CRUD endpoints
- [ ] Store template content as Yjs state

### 11.2 Template Management

- [ ] Create template library page
- [ ] Create template from page
- [ ] Implement template categories
- [ ] Add template search

### 11.3 Template Usage

- [ ] Create page from template endpoint
- [ ] Add "Use template" in new page flow
- [ ] Create quick-start templates

---

## Phase 12: File Storage

### 12.1 Storage Service

- [ ] Create storage service interface
- [ ] Implement local disk storage
- [ ] Implement MinIO storage
- [ ] Implement S3 storage
- [ ] Create file upload endpoint
- [ ] Create file download endpoint

### 12.2 File Management

- [ ] Create File model
- [ ] Track file metadata (size, type)
- [ ] Implement file type validation
- [ ] Implement file size limits
- [ ] Create file deletion

### 12.3 Admin Storage Config

- [ ] Create storage settings UI
- [ ] Validate storage credentials
- [ ] Migrate between storage providers (optional)

---

## Phase 13: Backup System

### 13.1 Backup Implementation

- [ ] Create Backup model
- [ ] Implement pg_dump automation
- [ ] Compress backups (gzip)
- [ ] Encrypt backups (AES-256)
- [ ] Upload to Backblaze B2

### 13.2 Backup Management

- [ ] Create backup listing endpoint
- [ ] Implement scheduled backups (cron)
- [ ] Create manual backup trigger
- [ ] Implement backup restoration
- [ ] Create backup settings UI

---

## Phase 14: API & Webhooks

### 14.1 Public API

- [ ] Create API token model
- [ ] Implement token generation
- [ ] Create API authentication middleware
- [ ] Document API endpoints
- [ ] Add rate limiting per token

### 14.2 API Token Management

- [ ] Create token listing endpoint
- [ ] Create token revocation
- [ ] Create API tokens UI
- [ ] Track token last used

### 14.3 Webhooks

- [ ] Create Webhook model
- [ ] Create WebhookDelivery model
- [ ] Implement webhook triggering service
- [ ] Add webhook signature verification
- [ ] Implement retry logic

### 14.4 Webhook Management

- [ ] Create webhook CRUD endpoints
- [ ] Create webhooks management UI
- [ ] Display delivery logs
- [ ] Test webhook delivery

---

## Phase 15: Admin Features

### 15.1 Audit Logging

- [ ] Create AuditLog model
- [ ] Implement audit logging service
- [ ] Log user actions (CRUD, auth, permissions)
- [ ] Create audit log viewing endpoint
- [ ] Create audit logs UI with filters

### 15.2 System Settings

- [ ] Create SystemSettings model
- [ ] Create settings endpoints
- [ ] Create admin settings pages
- [ ] Implement setting validation

### 15.3 Admin Dashboard

- [ ] Create system stats endpoints
- [ ] Display user/org/page counts
- [ ] Show storage usage
- [ ] Show system health status

---

## Phase 16: AI Features

### 16.1 OpenRouter Integration

- [ ] Create OpenRouter client
- [ ] Implement API key configuration
- [ ] Add AI enabled toggle

### 16.2 Content Translation

- [ ] Create translation endpoint
- [ ] Implement translation UI (context menu)
- [ ] Support multiple target languages
- [ ] Cache translations (optional)

### 16.3 AI Toggle

- [ ] Add aiEnabled to Organization
- [ ] Add global AI disable in SystemSettings
- [ ] Hide AI features when disabled

---

## Phase 17: Internationalization

### 17.1 UI Translation

- [ ] Setup vue-i18n
- [ ] Extract UI strings to locale files
- [ ] Create English locale (en.json)
- [ ] Create language switcher
- [ ] Persist language preference

### 17.2 Community Translations

- [ ] Document translation contribution process
- [ ] Add locale files for common languages
- [ ] Create translation status page

---

## Phase 18: Compliance

### 18.1 GDPR - Data Export

- [ ] Create user data export endpoint
- [ ] Export user's pages, comments, files
- [ ] Generate downloadable archive
- [ ] Create data export UI

### 18.2 GDPR - Account Deletion

- [ ] Create account deletion endpoint
- [ ] Implement cascading deletes
- [ ] Add deletion confirmation flow
- [ ] Remove from all organizations

---

## Phase 19: Editor Enhancements

### 19.1 Slash Commands

- [ ] Create slash command extension
- [ ] Build command menu component
- [ ] Add block type commands
- [ ] Add keyboard navigation

### 19.2 Additional Block Types

- [ ] Add Code block with syntax highlighting
- [ ] Add Quote block
- [ ] Add Callout/Alert block
- [ ] Add Divider block
- [ ] Add Table of Contents block
- [ ] Add Toggle/Collapsible block

### 19.3 Drag & Drop

- [ ] Implement block drag handles
- [ ] Add drop indicators
- [ ] Reorder blocks via drag
- [ ] Move blocks between pages (optional)

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
- [ ] Plan native app (React Native)

---

## 4. Developer Attribution

- **Developer**: Akaal Creatives
- **Website**: https://www.akaalcreatives.com

All deployments must include visible attribution and the `/dev` API endpoint.

## 5. License

GNU AGPLv3 - Derivative works used as a service must share source code.
