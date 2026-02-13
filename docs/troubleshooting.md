# LibreDiary Troubleshooting Guide

Common issues and their solutions when running LibreDiary.

---

## Installation & Setup

### Database connection fails

**Symptom**: `Error: P1001: Can't reach database server`

**Solutions**:

1. Verify `DATABASE_URL` in your `.env` file is correct
2. Check that PostgreSQL is running: `pg_isready -h localhost -p 5432`
3. Ensure the database exists: `psql -l | grep librediary`
4. Check network connectivity if using a remote database
5. Verify firewall rules allow connections on port 5432

### Prisma migration fails

**Symptom**: `Error: P3005: The database schema is not empty`

**Solutions**:

1. For a fresh install: `pnpm db:push`
2. For upgrades: `pnpm db:migrate`
3. If stuck, reset the database (development only): `pnpm db:reset`

### Setup wizard not appearing

**Symptom**: The application loads but shows a login page instead of the setup wizard.

**Solutions**:

1. Check if setup is already completed: `GET /api/v1/setup/status`
2. If the database has existing data, setup is considered complete
3. For a fresh setup, ensure the database is empty

---

## Authentication

### Cannot log in

**Symptom**: Login returns "Invalid credentials" despite correct password.

**Solutions**:

1. Check that the user account exists and is not soft-deleted
2. Verify email is correct (case-sensitive)
3. Try resetting the password via "Forgot Password"
4. Check if email verification is required but not completed
5. Clear browser cookies and try again

### Session keeps expiring

**Symptom**: User is logged out unexpectedly.

**Solutions**:

1. Check `sessionMaxAge` in system settings (Admin > Settings)
2. Ensure the `APP_SECRET` hasn't changed between server restarts
3. Verify the system clock is accurate on the server
4. Check if another admin revoked the session

### OAuth login fails

**Symptom**: "OAuth callback error" or redirect loop.

**Solutions**:

1. Verify OAuth client ID and secret are correctly configured
2. Check the callback URL matches exactly what's configured in GitHub/Google
3. Ensure `APP_URL` environment variable is set correctly
4. Check server logs for detailed OAuth error messages

---

## Editor & Pages

### Editor not loading

**Symptom**: Page shows a blank editor or perpetual loading spinner.

**Solutions**:

1. Hard refresh the page: `Ctrl/Cmd + Shift + R`
2. Clear browser cache and local storage
3. Check browser console for JavaScript errors
4. Ensure WebSocket connections are not blocked by a firewall or proxy
5. Try a different browser to isolate the issue

### Real-time collaboration not working

**Symptom**: Other users' cursors don't appear, or changes don't sync.

**Solutions**:

1. Check WebSocket connectivity — the `/collaboration/:orgId/:pageId` endpoint must be accessible
2. If behind a reverse proxy (nginx, Caddy), ensure WebSocket upgrade headers are configured:
   ```nginx
   location /collaboration/ {
       proxy_pass http://backend;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```
3. Check that the Hocuspocus server is running (it starts with the main server)
4. Verify both users are in the same organisation

### Page version history empty

**Symptom**: No versions appear in the version history panel.

**Solutions**:

1. Versions are created automatically during collaboration sessions
2. Manual snapshots can be created from the version history panel
3. Check that the collaboration server is connected (versions are created via Hocuspocus hooks)

---

## Search

### Search returns no results

**Symptom**: Searching for known content returns empty results.

**Solutions**:

#### With Meilisearch:

1. Verify Meilisearch is running: `curl http://localhost:7700/health`
2. Check `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` in environment
3. Trigger a full reindex: `Admin > Search > Reindex`
4. Check the reindex status for errors

#### With PostgreSQL FTS (fallback):

1. Search uses PostgreSQL full-text search when Meilisearch is unavailable
2. Only page titles and content are indexed
3. Ensure the content is not empty or only whitespace
4. PostgreSQL FTS does not have typo tolerance

### Meilisearch reindex fails

**Symptom**: Reindex starts but shows errors.

**Solutions**:

1. Check Meilisearch logs for detailed errors
2. Ensure Meilisearch has sufficient memory (at least 256MB recommended)
3. Check disk space on the Meilisearch server
4. Verify the API key has write permissions

---

## File Storage

### File upload fails

**Symptom**: "Upload failed" error when attaching files.

**Solutions**:

1. Check the file size limit configured for your instance
2. Verify the storage provider is configured correctly
3. Test storage connectivity: `Admin > Storage > Test Connection`
4. Check disk space (for local storage) or bucket permissions (for S3/MinIO)
5. Verify the MIME type is allowed

### Files not loading/downloading

**Symptom**: Uploaded files show broken images or download fails.

**Solutions**:

1. Check if the storage provider is accessible
2. For S3/MinIO: verify bucket policies and CORS configuration
3. For local storage: check file permissions on the upload directory
4. Verify the file record exists in the database

### Storage migration fails

**Symptom**: Migration reports errors for some files.

**Solutions**:

1. Run a dry-run first to identify potential issues
2. Check the error details — migration continues on per-file failures
3. Verify the target storage provider connectivity before migrating
4. Ensure sufficient storage space on the target
5. Re-run migration to retry only failed files (already-migrated files are skipped)

---

## Backups

### Backup creation fails

**Symptom**: Backup status shows "FAILED".

**Solutions**:

1. Check the backup error message in the backup details
2. Verify backup storage is configured and accessible
3. Check available disk space
4. For system backups: ensure `pg_dump` is installed (`Admin > Backups > pg_dump Check`)
5. Check the `BACKUP_MAX_SIZE_MB` limit — large organisations may exceed it

### Backup restore fails

**Symptom**: Restore returns an error.

**Solutions**:

1. **"Password required for encrypted backup"**: The backup is encrypted — provide the password used during creation
2. **"Decryption failed"**: The password is incorrect or the backup file is corrupted
3. **"Unsupported backup manifest version"**: The backup was created with a newer version of LibreDiary
4. **"BACKUP_NOT_FOUND"**: The backup record doesn't exist or has been deleted
5. **"BACKUP_NOT_AVAILABLE"**: The backup hasn't finished processing yet — wait for it to complete

### Automated backups not running

**Symptom**: No new backups are being created on schedule.

**Solutions**:

1. Verify `BACKUP_ENABLED` is `true`
2. Check the `BACKUP_SCHEDULE` cron expression is valid
3. Ensure the server process hasn't restarted (the scheduler runs in-process)
4. Check server logs for scheduler errors

---

## AI Features

### AI features not available

**Symptom**: AI options don't appear in the editor or translation menu.

**Solutions**:

1. Verify AI is enabled globally: `Admin > Settings > AI Enabled`
2. Check that AI is enabled for the organisation: `Admin > Organisations > [org] > AI Enabled`
3. Verify the OpenRouter API key is set
4. Test the AI connection: `Admin > AI > Test Connection`

### AI responses are slow or fail

**Symptom**: AI requests time out or return errors.

**Solutions**:

1. Check the OpenRouter API key is valid and has credits
2. Verify the selected model is available on OpenRouter
3. Check network connectivity to `openrouter.ai`
4. Try a different model if the current one is overloaded
5. Check server logs for detailed error messages

### Translation returns errors

**Symptom**: Translation requests fail for certain languages.

**Solutions**:

1. Verify the target language is in the list of 31 supported languages
2. Check that the source content is not empty
3. Large content blocks may need to be translated in smaller chunks

---

## Performance

### Slow page loads

**Symptom**: Pages take a long time to load.

**Solutions**:

1. Check database performance — run `EXPLAIN ANALYZE` on slow queries
2. Ensure PostgreSQL has adequate memory and connections
3. Enable page caching in the frontend (stale-while-revalidate is built-in)
4. Consider adding Meilisearch for faster search operations
5. Check network latency between the server and database

### High memory usage

**Symptom**: The Node.js process consumes excessive memory.

**Solutions**:

1. Check for large file uploads consuming buffer memory
2. Monitor WebSocket connections — each collaboration session uses memory
3. Set `NODE_OPTIONS=--max-old-space-size=2048` for larger instances
4. Review the number of concurrent users vs server resources

### Database connection pool exhausted

**Symptom**: `Error: Too many connections` or similar.

**Solutions**:

1. Increase the connection pool size in `DATABASE_URL`: `?connection_limit=20`
2. Close idle connections with `?pool_timeout=10`
3. Check for connection leaks in server logs
4. Consider using PgBouncer for connection pooling in production

---

## Docker Deployment

### Container won't start

**Symptom**: Docker container exits immediately.

**Solutions**:

1. Check container logs: `docker logs librediary`
2. Verify all required environment variables are set
3. Ensure the database is accessible from within the container
4. Check port mappings are correct

### Database migration in Docker

**Symptom**: The database schema is out of date after upgrading.

**Solutions**:

1. Migrations run automatically on startup
2. If they fail, run manually: `docker exec librediary pnpm db:push`
3. Check the database user has DDL permissions

### Volume permissions

**Symptom**: "Permission denied" errors for file uploads or backups.

**Solutions**:

1. Ensure the upload and backup directories are writable by the container user
2. Check Docker volume mount permissions
3. On Linux: verify the UID/GID matches between the container and host

---

## Network & Proxy

### Reverse proxy configuration

For nginx:

```nginx
server {
    listen 443 ssl;
    server_name librediary.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /collaboration/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### CORS issues

**Symptom**: Browser console shows CORS errors.

**Solutions**:

1. Ensure the `APP_URL` environment variable matches the browser's URL exactly
2. Check that the reverse proxy isn't stripping CORS headers
3. Verify the origin is in the allowed list

---

## Getting Help

If you can't resolve an issue:

1. Check the server logs for detailed error messages
2. Search existing issues on [GitHub](https://github.com/Akaal-Creatives/LibreDiary/issues)
3. Open a new issue with:
   - LibreDiary version
   - Node.js version
   - Steps to reproduce
   - Error messages and logs
   - Environment (Docker, bare metal, OS)

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
