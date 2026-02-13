# LibreDiary Admin Guide

This guide covers system administration for LibreDiary, including initial setup, user management, system settings, backups, and monitoring.

---

## Initial Setup

### First-Run Setup Wizard

When LibreDiary starts for the first time, the setup wizard will guide you through:

1. **Create Super Admin Account**: Set up the first user with full system access
2. **Configure Organisation**: Create the initial organisation
3. **System Settings**: Configure basic settings (site name, signup policy)

The setup endpoint (`GET /setup/status`) returns whether setup is required. After completion, the wizard is disabled.

### Environment Variables

Key configuration is handled via environment variables. See `.env.example` for all options:

| Variable                | Description                           | Default     |
| ----------------------- | ------------------------------------- | ----------- |
| `DATABASE_URL`          | PostgreSQL connection string          | Required    |
| `APP_SECRET`            | Session encryption secret             | Required    |
| `PORT`                  | Server port                           | `3000`      |
| `STORAGE_TYPE`          | File storage (`LOCAL`, `MINIO`, `S3`) | `LOCAL`     |
| `BACKUP_ENABLED`        | Enable backup system                  | `true`      |
| `BACKUP_STORAGE_TYPE`   | Backup storage (`LOCAL`, `S3`)        | `LOCAL`     |
| `BACKUP_SCHEDULE`       | Cron schedule for auto-backups        | `0 2 * * *` |
| `BACKUP_RETENTION_DAYS` | Auto-delete backups after N days      | `30`        |
| `MEILISEARCH_HOST`      | Meilisearch URL (optional)            | —           |
| `MEILISEARCH_API_KEY`   | Meilisearch API key                   | —           |
| `AI_ENABLED`            | Enable AI features globally           | `false`     |
| `OPENROUTER_API_KEY`    | OpenRouter API key                    | —           |
| `OPENROUTER_MODEL`      | AI model to use                       | —           |

---

## Admin Dashboard

Access the admin dashboard from the top-right menu (visible only to super admins). The dashboard provides:

### System Statistics

- Total users, organisations, and pages
- Active users in the last 30 days
- Storage usage

### System Health

- Database connectivity
- Storage provider status
- Search engine status
- AI service connectivity

---

## User Management

### Listing Users

View all users with pagination and search. Each user entry shows:

- Name, email, and registration date
- Super admin status
- Email verification status
- Organisations they belong to

### Updating Users

- **Name**: Change a user's display name
- **Super Admin**: Grant or revoke super admin privileges
- Note: You cannot remove your own super admin status

### Soft Deleting Users

Soft-deleted users:

- Cannot log in
- Are removed from all organisations
- Can be restored by an admin
- Are permanently deleted after the retention period

### Restoring Users

Restore soft-deleted users from the admin panel to reactivate their account.

---

## Organisation Management

### Listing Organisations

View all organisations with member counts and creation dates.

### Updating Organisations

- **Name**: Change the display name
- **Slug**: Change the URL identifier
- **AI Enabled**: Toggle AI features per organisation

### Soft Deleting Organisations

Soft-deleted organisations and all their data (pages, databases, files) become inaccessible. They can be restored within the retention period.

---

## System Settings

Manage global settings from `Admin > Settings`:

| Setting                        | Description                                  |
| ------------------------------ | -------------------------------------------- |
| **Site Name**                  | Displayed in the browser title and emails    |
| **Allow Signups**              | Whether new users can register (with invite) |
| **Require Email Verification** | Force email verification before access       |
| **Session Max Age**            | Session timeout duration                     |
| **Max Organisations Per User** | Limit on orgs a user can create              |
| **Default User Locale**        | Default language for new users               |
| **AI Enabled**                 | Global AI feature toggle                     |
| **OpenRouter API Key**         | API key for AI features                      |
| **OpenRouter Model**           | Which AI model to use                        |

---

## Storage Management

LibreDiary supports three storage providers:

| Provider  | Use Case                          |
| --------- | --------------------------------- |
| **LOCAL** | Development and small deployments |
| **MINIO** | Self-hosted S3-compatible storage |
| **S3**    | AWS S3 or compatible services     |

### Storage Info

View current storage configuration and usage from `Admin > Storage`.

### Testing Connectivity

Test the current storage provider's connectivity from the admin panel.

### Storage Migration

Migrate all files between storage providers:

1. Go to `Admin > Storage > Migrate`
2. Select the target provider type (`LOCAL`, `MINIO`, or `S3`)
3. Optionally run a dry-run first to see what would be migrated
4. Execute the migration

The migration downloads each file from the source, uploads to the target, updates the database record, and deletes from the source. Failures are tracked per-file and don't stop the overall migration.

---

## Backup System

### Backup Types

| Type             | Scope           | Contents                          |
| ---------------- | --------------- | --------------------------------- |
| **Organisation** | Single org      | Pages, databases, files, manifest |
| **System**       | Entire instance | PostgreSQL dump + all org backups |

### Creating Backups

#### Organisation Backups

Members can create backups of their organisation from the organisation settings. Options:

- **Encryption**: Optionally encrypt with AES-256-GCM using a password
- **Format**: tar.gz archive containing manifest.json and file data

#### System Backups

Super admins can create full system backups from the admin panel. Requires `pg_dump` to be available on the server.

### Backup Schedule

Automatic backups run on the schedule defined by `BACKUP_SCHEDULE` (cron format). Default is daily at 02:00.

### Backup Retention

Backups older than `BACKUP_RETENTION_DAYS` are automatically cleaned up. Default is 30 days.

### Restoring Backups

#### Organisation Restore

1. Go to `Organisation Settings > Backups`
2. Find the backup to restore
3. Click "Restore"
4. Provide the encryption password if the backup is encrypted
5. The restore process will recreate pages (with hierarchy), databases (with properties, views, rows), and files

**Important**: Restoration creates new records — it does not overwrite existing data.

#### System Restore

System backups can be restored from the admin panel. The process restores the PostgreSQL database state.

### Backup Storage

Backups can be stored locally or in S3-compatible storage, independently from the file storage configuration:

| Setting                | Description          |
| ---------------------- | -------------------- |
| `BACKUP_STORAGE_TYPE`  | `LOCAL` or `S3`      |
| `BACKUP_LOCAL_PATH`    | Local directory path |
| `BACKUP_S3_ENDPOINT`   | S3 endpoint URL      |
| `BACKUP_S3_BUCKET`     | S3 bucket name       |
| `BACKUP_S3_REGION`     | S3 region            |
| `BACKUP_S3_ACCESS_KEY` | S3 access key        |
| `BACKUP_S3_SECRET_KEY` | S3 secret key        |

---

## Search Configuration

### PostgreSQL Full-Text Search (Default)

Built-in search using PostgreSQL's `tsvector` — no additional services required.

### Meilisearch (Optional)

For better search performance and typo tolerance:

1. Deploy a Meilisearch instance
2. Set `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`
3. Run a full reindex from `Admin > Search > Reindex`

The system falls back to PostgreSQL FTS if Meilisearch is unavailable.

---

## AI Configuration

### Setting Up AI

1. Enable AI globally: `Admin > Settings > AI Enabled`
2. Set the OpenRouter API key: `Admin > Settings > OpenRouter API Key`
3. Choose a model: `Admin > Settings > OpenRouter Model`
4. Test the connection: `Admin > AI > Test Connection`

### Per-Organisation Control

AI can be toggled per organisation. Even if globally enabled, organisations with AI disabled won't have access to AI features.

---

## Audit Logging

All administrative and security-sensitive actions are logged:

- User login/logout
- User and organisation CRUD operations
- Settings changes
- Backup creation and restoration
- Permission changes

### Viewing Audit Logs

Access audit logs from `Admin > Audit Logs`. Filter by:

- Action type
- User
- Date range
- Resource type

---

## API & Webhooks

### API Tokens

Users can create personal API tokens for server-to-server integration. Tokens use Bearer authentication.

### Webhooks

Organisations can configure webhooks to receive HTTP notifications when events occur:

- **Events**: page.created, page.updated, page.deleted, backup.completed, etc.
- **Security**: Payloads are signed with HMAC-SHA256
- **Reliability**: Failed deliveries are retried automatically
- **Monitoring**: View delivery logs per webhook

---

## Monitoring

### Health Check

`GET /health` returns the system status. Use this for load balancer health checks and uptime monitoring.

### System Health Endpoint

`GET /admin/health` (authenticated) returns detailed health information including database, storage, search, and AI service status.

---

## Security Recommendations

1. **Use HTTPS**: Always deploy behind a reverse proxy with TLS
2. **Strong Secrets**: Use long, random values for `APP_SECRET`
3. **Database Security**: Use strong PostgreSQL passwords and restrict network access
4. **Regular Backups**: Enable automated backups with encryption
5. **Update Regularly**: Keep LibreDiary and its dependencies up to date
6. **Limit Signups**: Disable public signups if not needed
7. **Email Verification**: Enable email verification for new accounts
8. **Monitor Audit Logs**: Regularly review audit logs for suspicious activity

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
