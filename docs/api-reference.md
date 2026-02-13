# LibreDiary API Reference

Base URL: `/api/v1`

All endpoints return JSON with the standard envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": { ... } } }
```

---

## Authentication

LibreDiary supports two authentication methods:

| Method    | Header / Mechanism               | Use Case         |
| --------- | -------------------------------- | ---------------- |
| Session   | HTTP-only `session_token` cookie | Browser clients  |
| API Token | `Authorization: Bearer <token>`  | Server-to-server |

### Authorisation Levels

- **Public** — no authentication required
- **Authenticated** — valid session or API token
- **Org Member** — authenticated + member of the target organisation
- **Org Admin** — authenticated + admin role in the organisation
- **Org Owner** — authenticated + owner role in the organisation
- **Super Admin** — authenticated + `isSuperAdmin` flag on user record

---

## Public Endpoints

### Health & Info

| Method | Path      | Description           |
| ------ | --------- | --------------------- |
| GET    | `/health` | Health check          |
| GET    | `/dev`    | Developer information |
| GET    | `/api/v1` | API version           |

### Setup

| Method | Path              | Description                             |
| ------ | ----------------- | --------------------------------------- |
| GET    | `/setup/status`   | Check if initial setup is required      |
| POST   | `/setup/complete` | Complete initial setup (first-run only) |

### Public Pages

| Method | Path                         | Description                |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/public/pages/:slug`        | Get a public page by slug  |
| GET    | `/public/pages/share/:token` | Get a page via share token |

---

## Auth (`/auth`)

| Method | Path                        | Auth | Description                   |
| ------ | --------------------------- | ---- | ----------------------------- |
| POST   | `/auth/register`            | No   | Register with invite token    |
| POST   | `/auth/login`               | No   | Login with email and password |
| POST   | `/auth/logout`              | Yes  | Destroy current session       |
| GET    | `/auth/me`                  | Yes  | Get current user              |
| PATCH  | `/auth/profile`             | Yes  | Update profile (name, locale) |
| POST   | `/auth/verify-email`        | No   | Verify email with token       |
| POST   | `/auth/resend-verification` | Yes  | Resend verification email     |
| POST   | `/auth/forgot-password`     | No   | Request password reset        |
| POST   | `/auth/reset-password`      | No   | Reset password with token     |
| GET    | `/auth/sessions`            | Yes  | List active sessions          |
| DELETE | `/auth/sessions/:id`        | Yes  | Revoke a session              |
| GET    | `/auth/ws-token`            | Yes  | Get WebSocket auth token      |
| GET    | `/auth/invite/:token`       | No   | Get invite details            |

## OAuth (`/oauth`)

| Method | Path                        | Auth | Description                          |
| ------ | --------------------------- | ---- | ------------------------------------ |
| GET    | `/oauth/providers`          | No   | List configured OAuth providers      |
| GET    | `/oauth/:provider`          | No   | Initiate OAuth flow (GitHub, Google) |
| GET    | `/oauth/:provider/callback` | No   | Handle OAuth callback                |
| GET    | `/oauth/accounts`           | Yes  | Get linked OAuth accounts            |
| GET    | `/oauth/:provider/link`     | Yes  | Initiate account linking             |
| DELETE | `/oauth/:provider/unlink`   | Yes  | Unlink OAuth account                 |

---

## Organisations (`/organizations`)

| Method | Path                    | Auth   | Description               |
| ------ | ----------------------- | ------ | ------------------------- |
| POST   | `/organizations`        | Yes    | Create organisation       |
| GET    | `/organizations`        | Yes    | List user's organisations |
| GET    | `/organizations/:orgId` | Member | Get organisation details  |
| PATCH  | `/organizations/:orgId` | Admin  | Update organisation       |
| DELETE | `/organizations/:orgId` | Owner  | Soft delete organisation  |

### Members

| Method | Path                                       | Auth   | Description        |
| ------ | ------------------------------------------ | ------ | ------------------ |
| GET    | `/organizations/:orgId/members`            | Member | List members       |
| PATCH  | `/organizations/:orgId/members/:memberId`  | Admin  | Update member role |
| DELETE | `/organizations/:orgId/members/:memberId`  | Admin  | Remove member      |
| POST   | `/organizations/:orgId/leave`              | Member | Leave organisation |
| POST   | `/organizations/:orgId/transfer-ownership` | Owner  | Transfer ownership |

### Invites

| Method | Path                                             | Auth  | Description          |
| ------ | ------------------------------------------------ | ----- | -------------------- |
| POST   | `/organizations/:orgId/invites`                  | Admin | Create invite        |
| GET    | `/organizations/:orgId/invites`                  | Admin | List pending invites |
| DELETE | `/organizations/:orgId/invites/:inviteId`        | Admin | Cancel invite        |
| POST   | `/organizations/:orgId/invites/:inviteId/resend` | Admin | Resend invite        |

---

## Pages (`/organizations/:orgId/pages`)

| Method | Path                                            | Auth   | Description            |
| ------ | ----------------------------------------------- | ------ | ---------------------- |
| POST   | `/organizations/:orgId/pages`                   | Member | Create page            |
| GET    | `/organizations/:orgId/pages`                   | Member | Get page tree          |
| GET    | `/organizations/:orgId/pages/:pageId`           | Member | Get single page        |
| PATCH  | `/organizations/:orgId/pages/:pageId`           | Member | Update page            |
| DELETE | `/organizations/:orgId/pages/:pageId`           | Member | Trash page             |
| POST   | `/organizations/:orgId/pages/:pageId/move`      | Member | Move page              |
| GET    | `/organizations/:orgId/pages/:pageId/ancestors` | Member | Get breadcrumbs        |
| POST   | `/organizations/:orgId/pages/:pageId/duplicate` | Member | Duplicate page         |
| POST   | `/organizations/:orgId/pages/:pageId/favorite`  | Member | Add to favourites      |
| DELETE | `/organizations/:orgId/pages/:pageId/favorite`  | Member | Remove from favourites |
| POST   | `/organizations/:orgId/pages/:pageId/restore`   | Member | Restore from trash     |

### Trash

| Method | Path                                  | Auth   | Description        |
| ------ | ------------------------------------- | ------ | ------------------ |
| GET    | `/organizations/:orgId/trash`         | Member | List trashed pages |
| DELETE | `/organizations/:orgId/trash/:pageId` | Member | Permanently delete |

### Favourites

| Method | Path                                      | Auth   | Description        |
| ------ | ----------------------------------------- | ------ | ------------------ |
| GET    | `/organizations/:orgId/favorites`         | Member | Get favourites     |
| PATCH  | `/organizations/:orgId/favorites/reorder` | Member | Reorder favourites |

---

## Page Versions (`/organizations/:orgId/pages/:pageId/versions`)

| Method | Path                              | Auth   | Description        |
| ------ | --------------------------------- | ------ | ------------------ |
| GET    | `.../versions`                    | Member | List versions      |
| GET    | `.../versions/:versionId`         | Member | Get version        |
| POST   | `.../versions`                    | Member | Create snapshot    |
| GET    | `.../versions/:versionId/diff`    | Member | Compare versions   |
| POST   | `.../versions/:versionId/restore` | Member | Restore to version |

---

## Permissions (`/organizations/:orgId/pages/:pageId/permissions`)

| Method | Path                                       | Auth   | Description           |
| ------ | ------------------------------------------ | ------ | --------------------- |
| GET    | `.../permissions`                          | Member | List page permissions |
| POST   | `.../permissions`                          | Member | Grant permission      |
| PATCH  | `.../permissions/:permissionId`            | Member | Update permission     |
| DELETE | `.../permissions/:permissionId`            | Member | Revoke permission     |
| POST   | `.../permissions/share-link`               | Member | Create share link     |
| GET    | `.../permissions/share-links`              | Member | List share links      |
| DELETE | `.../permissions/share-link/:permissionId` | Member | Delete share link     |

---

## Comments (`/organizations/:orgId/pages/:pageId/comments`)

| Method | Path                              | Auth   | Description       |
| ------ | --------------------------------- | ------ | ----------------- |
| GET    | `.../comments`                    | Member | Get page comments |
| GET    | `.../comments/count`              | Member | Get comment count |
| POST   | `.../comments`                    | Member | Create comment    |
| PATCH  | `.../comments/:commentId`         | Member | Update comment    |
| DELETE | `.../comments/:commentId`         | Member | Delete comment    |
| POST   | `.../comments/:commentId/resolve` | Member | Resolve/unresolve |

---

## Mentions (`/organizations/:orgId/mentions`)

| Method | Path                        | Auth   | Description               |
| ------ | --------------------------- | ------ | ------------------------- |
| GET    | `.../mentions/users/search` | Member | Search users for @mention |
| GET    | `.../mentions`              | Member | Get user's mentions       |

---

## Notifications (`/notifications`)

| Method | Path                                  | Auth | Description         |
| ------ | ------------------------------------- | ---- | ------------------- |
| GET    | `/notifications`                      | Yes  | Get notifications   |
| GET    | `/notifications/unread-count`         | Yes  | Get unread count    |
| GET    | `/notifications/preferences`          | Yes  | Get preferences     |
| PATCH  | `/notifications/preferences`          | Yes  | Update preferences  |
| GET    | `/notifications/:notificationId`      | Yes  | Get notification    |
| PATCH  | `/notifications/:notificationId/read` | Yes  | Mark as read        |
| PATCH  | `/notifications/read-all`             | Yes  | Mark all as read    |
| DELETE | `/notifications/:notificationId`      | Yes  | Delete notification |

---

## Search (`/organizations/:orgId/search`)

| Method | Path                | Auth   | Description  |
| ------ | ------------------- | ------ | ------------ |
| GET    | `.../search?q=term` | Member | Search pages |

**Query parameters:** `q` (required), `limit`, `offset`, `dateFrom`, `dateTo`, `createdById`, `facets`

Uses Meilisearch when available, falls back to PostgreSQL full-text search.

---

## Databases (`/organizations/:orgId/databases`)

| Method | Path                        | Auth   | Description     |
| ------ | --------------------------- | ------ | --------------- |
| POST   | `.../databases`             | Member | Create database |
| GET    | `.../databases`             | Member | List databases  |
| GET    | `.../databases/:databaseId` | Member | Get database    |
| PATCH  | `.../databases/:databaseId` | Member | Update database |
| DELETE | `.../databases/:databaseId` | Member | Delete database |

### Properties

| Method | Path                                               | Auth   | Description        |
| ------ | -------------------------------------------------- | ------ | ------------------ |
| POST   | `.../databases/:databaseId/properties`             | Member | Create property    |
| PATCH  | `.../databases/:databaseId/properties/:propertyId` | Member | Update property    |
| DELETE | `.../databases/:databaseId/properties/:propertyId` | Member | Delete property    |
| POST   | `.../databases/:databaseId/properties/reorder`     | Member | Reorder properties |

### Rows

| Method | Path                                         | Auth   | Description      |
| ------ | -------------------------------------------- | ------ | ---------------- |
| POST   | `.../databases/:databaseId/rows`             | Member | Create row       |
| PATCH  | `.../databases/:databaseId/rows/:rowId`      | Member | Update row       |
| DELETE | `.../databases/:databaseId/rows/:rowId`      | Member | Delete row       |
| POST   | `.../databases/:databaseId/rows/reorder`     | Member | Reorder rows     |
| POST   | `.../databases/:databaseId/rows/bulk-delete` | Member | Bulk delete rows |

### Views

| Method | Path                                      | Auth   | Description   |
| ------ | ----------------------------------------- | ------ | ------------- |
| POST   | `.../databases/:databaseId/views`         | Member | Create view   |
| PATCH  | `.../databases/:databaseId/views/:viewId` | Member | Update view   |
| DELETE | `.../databases/:databaseId/views/:viewId` | Member | Delete view   |
| POST   | `.../databases/:databaseId/views/reorder` | Member | Reorder views |

---

## Templates (`/organizations/:orgId/templates`)

| Method | Path                            | Auth   | Description               |
| ------ | ------------------------------- | ------ | ------------------------- |
| POST   | `.../templates`                 | Member | Create template           |
| POST   | `.../templates/from-page`       | Member | Create from existing page |
| GET    | `.../templates`                 | Member | List templates            |
| GET    | `.../templates/:templateId`     | Member | Get template              |
| PATCH  | `.../templates/:templateId`     | Member | Update template           |
| DELETE | `.../templates/:templateId`     | Member | Delete template           |
| POST   | `.../templates/:templateId/use` | Member | Create page from template |

---

## Files (`/organizations/:orgId/files`)

| Method | Path                         | Auth   | Description             |
| ------ | ---------------------------- | ------ | ----------------------- |
| POST   | `.../files`                  | Member | Upload file (multipart) |
| GET    | `.../files`                  | Member | List files              |
| GET    | `.../files/:fileId`          | Member | Get file metadata       |
| GET    | `.../files/:fileId/download` | Member | Download file           |
| DELETE | `.../files/:fileId`          | Member | Delete file             |

---

## Backups

### Organisation Backups (`/organizations/:orgId/backups`)

| Method | Path                             | Auth   | Description     |
| ------ | -------------------------------- | ------ | --------------- |
| GET    | `.../backups`                    | Member | List backups    |
| POST   | `.../backups`                    | Member | Create backup   |
| GET    | `.../backups/:backupId`          | Member | Get backup      |
| GET    | `.../backups/:backupId/download` | Member | Download backup |
| DELETE | `.../backups/:backupId`          | Member | Delete backup   |
| POST   | `.../backups/:backupId/restore`  | Member | Restore backup  |

**Create backup body:**

```json
{ "encrypt": false, "password": "optional-min-8-chars" }
```

**Restore backup body:**

```json
{ "password": "required-if-encrypted" }
```

### Admin Backups (`/admin/backups`) — Super Admin

| Method | Path                                       | Description                |
| ------ | ------------------------------------------ | -------------------------- |
| GET    | `/admin/backups/settings`                  | Get backup settings        |
| GET    | `/admin/backups/pg-dump-check`             | Check pg_dump availability |
| GET    | `/admin/backups`                           | List all backups           |
| POST   | `/admin/backups/system`                    | Create system backup       |
| GET    | `/admin/backups/system/:backupId`          | Get system backup          |
| GET    | `/admin/backups/system/:backupId/download` | Download system backup     |
| DELETE | `/admin/backups/system/:backupId`          | Delete system backup       |
| POST   | `/admin/backups/system/:backupId/restore`  | Restore system backup      |

---

## API Tokens (`/api-tokens`)

| Method | Path                   | Auth | Description      |
| ------ | ---------------------- | ---- | ---------------- |
| POST   | `/api-tokens`          | Yes  | Create API token |
| GET    | `/api-tokens`          | Yes  | List tokens      |
| DELETE | `/api-tokens/:tokenId` | Yes  | Revoke token     |

---

## Webhooks (`/organizations/:orgId/webhooks`)

| Method | Path                                 | Auth   | Description        |
| ------ | ------------------------------------ | ------ | ------------------ |
| GET    | `.../webhooks`                       | Member | List webhooks      |
| POST   | `.../webhooks`                       | Member | Create webhook     |
| GET    | `.../webhooks/:webhookId`            | Member | Get webhook        |
| PUT    | `.../webhooks/:webhookId`            | Member | Update webhook     |
| DELETE | `.../webhooks/:webhookId`            | Member | Delete webhook     |
| POST   | `.../webhooks/:webhookId/test`       | Member | Send test event    |
| GET    | `.../webhooks/:webhookId/deliveries` | Member | List delivery logs |

Webhook payloads are signed with HMAC-SHA256 via the `X-Webhook-Signature` header. Failed deliveries are retried automatically.

---

## AI

### Writing (`/organizations/:orgId/ai/write`)

| Method | Path           | Auth   | Description                                       |
| ------ | -------------- | ------ | ------------------------------------------------- |
| POST   | `.../ai/write` | Member | AI writing (generate, expand, summarise, improve) |

### Translation (`/organizations/:orgId/ai/translate`)

| Method | Path               | Auth   | Description                   |
| ------ | ------------------ | ------ | ----------------------------- |
| POST   | `.../ai/translate` | Member | Translate text (31 languages) |

AI features require both system-level and organisation-level AI to be enabled.

---

## Admin (`/admin`) — Super Admin

### Statistics & Health

| Method | Path            | Description       |
| ------ | --------------- | ----------------- |
| GET    | `/admin/stats`  | System statistics |
| GET    | `/admin/health` | System health     |

### User Management

| Method | Path                           | Description                        |
| ------ | ------------------------------ | ---------------------------------- |
| GET    | `/admin/users`                 | List users (paginated, searchable) |
| GET    | `/admin/users/:userId`         | Get user details                   |
| PATCH  | `/admin/users/:userId`         | Update user                        |
| DELETE | `/admin/users/:userId`         | Soft delete user                   |
| POST   | `/admin/users/:userId/restore` | Restore user                       |

### Organisation Management

| Method | Path                                  | Description              |
| ------ | ------------------------------------- | ------------------------ |
| GET    | `/admin/organizations`                | List organisations       |
| GET    | `/admin/organizations/:orgId`         | Get organisation         |
| PATCH  | `/admin/organizations/:orgId`         | Update organisation      |
| DELETE | `/admin/organizations/:orgId`         | Soft delete organisation |
| POST   | `/admin/organizations/:orgId/restore` | Restore organisation     |

### System Settings

| Method | Path              | Description            |
| ------ | ----------------- | ---------------------- |
| GET    | `/admin/settings` | Get system settings    |
| PATCH  | `/admin/settings` | Update system settings |

### AI

| Method | Path             | Description        |
| ------ | ---------------- | ------------------ |
| POST   | `/admin/ai/test` | Test AI connection |

### Storage

| Method | Path                     | Description               |
| ------ | ------------------------ | ------------------------- |
| GET    | `/admin/storage/info`    | Get storage info          |
| POST   | `/admin/storage/test`    | Test storage connection   |
| POST   | `/admin/storage/migrate` | Migrate storage providers |

### Audit Logs

| Method | Path                        | Description                  |
| ------ | --------------------------- | ---------------------------- |
| GET    | `/admin/audit-logs`         | List audit logs (filterable) |
| GET    | `/admin/audit-logs/actions` | Get distinct action types    |

### Search Admin

| Method | Path                           | Description                 |
| ------ | ------------------------------ | --------------------------- |
| POST   | `/admin/search/reindex`        | Trigger Meilisearch reindex |
| GET    | `/admin/search/reindex/status` | Get reindex status          |

---

## GDPR (`/gdpr`)

| Method | Path                         | Auth | Description                     |
| ------ | ---------------------------- | ---- | ------------------------------- |
| POST   | `/gdpr/export`               | Yes  | Request data export             |
| GET    | `/gdpr/exports`              | Yes  | List exports                    |
| GET    | `/gdpr/exports/:id`          | Yes  | Get export                      |
| GET    | `/gdpr/exports/:id/download` | Yes  | Download export                 |
| GET    | `/gdpr/deletion-status`      | Yes  | Check deletion status           |
| POST   | `/gdpr/delete-account`       | Yes  | Request deletion (30-day grace) |
| POST   | `/gdpr/cancel-deletion`      | Yes  | Cancel pending deletion         |

---

## WebSocket — Collaboration

| Protocol  | Path                            | Auth | Description                        |
| --------- | ------------------------------- | ---- | ---------------------------------- |
| WebSocket | `/collaboration/:orgId/:pageId` | Yes  | Real-time editing (Hocuspocus/Yjs) |

Authentication via session cookie, Bearer token, or query string token.

---

## Rate Limiting

All endpoints are rate-limited. Limits vary by endpoint type:

- **Auth endpoints** (login, register): stricter limits
- **General API**: standard limits
- **File uploads**: size-based limits

Rate limit headers are included in responses:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
