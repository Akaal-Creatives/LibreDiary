# LibreDiary Deployment Guide

Self-hosted deployment using Docker Compose with nginx reverse proxy, TLS termination, and optional services.

## Architecture

```
Internet
    |
    v
[nginx:443/80]
    |
    +-- /api/*          --> server:3000
    +-- /health         --> server:3000
    +-- /dev            --> server:3000
    +-- /collaboration/ --> server:3000 (WebSocket)
    +-- /uploads/       --> server:3000
    +-- /*              --> web:80
                             |
                server:3000--+--postgres:5432
                             |
                        (optional)
                     minio:9000 | meilisearch:7700
```

All inter-service communication happens over an internal Docker network. Only nginx exposes ports to the host.

---

## 1. Prerequisites

- **Docker Engine** 24+ with Docker Compose v2
- **Domain name** pointing to your server's IP address
- **TLS certificate** (own certificate or Let's Encrypt)
- **2 GB RAM** minimum (4 GB recommended with optional services)
- **10 GB disk** minimum (more depending on file uploads and backups)

---

## 2. Quick Start

```bash
# Clone the repository
git clone https://github.com/Akaal-Creatives/LibreDiary.git
cd LibreDiary

# Create environment file
cp .env.example .env

# Edit .env with your production values (see Section 3)
nano .env

# Place TLS certificates (see Section 4) — or use HTTP-only mode (see Section 4b)
mkdir -p tooling/docker/nginx/ssl
cp /path/to/fullchain.pem tooling/docker/nginx/ssl/fullchain.pem
cp /path/to/privkey.pem tooling/docker/nginx/ssl/privkey.pem

# Build images
docker compose -f tooling/docker/docker-compose.production.yml build

# Start services (migrations and seed run automatically on first boot)
docker compose -f tooling/docker/docker-compose.production.yml up -d
```

---

## 3. Environment Configuration

Edit `.env` in the project root. The server container reads this file and applies container-specific overrides (DATABASE_URL, storage paths, etc.) automatically.

### Required Variables

| Variable            | Description                                   | Example                             |
| ------------------- | --------------------------------------------- | ----------------------------------- |
| `POSTGRES_PASSWORD` | PostgreSQL password (no default for security) | `a-strong-random-password`          |
| `APP_URL`           | Public URL of your instance                   | `https://diary.example.com`         |
| `API_URL`           | Public API URL (same domain in production)    | `https://diary.example.com`         |
| `APP_SECRET`        | Application secret (min 32 characters)        | `generate-with-openssl-rand-hex-32` |
| `SESSION_SECRET`    | Session secret (min 32 characters)            | `generate-with-openssl-rand-hex-32` |
| `DOMAIN`            | Domain name for nginx                         | `diary.example.com`                 |
| `FRONTEND_URL`      | Public frontend URL (for OAuth redirects)     | `https://diary.example.com`         |

### Optional Variables

| Variable              | Default       | Description                              |
| --------------------- | ------------- | ---------------------------------------- |
| `POSTGRES_USER`       | `librediary`  | PostgreSQL username                      |
| `POSTGRES_DB`         | `librediary`  | PostgreSQL database name                 |
| `HTTP_PORT`           | `80`          | Host port for HTTP                       |
| `HTTPS_PORT`          | `443`         | Host port for HTTPS                      |
| `SSL_CERT_PATH`       | `./nginx/ssl` | Path to TLS certificates directory       |
| `STORAGE_TYPE`        | `local`       | Storage provider: `local`, `minio`, `s3` |
| `BACKUP_ENABLED`      | `false`       | Enable scheduled backups                 |
| `BACKUP_SCHEDULE`     | `0 2 * * *`   | Backup cron schedule                     |
| `AI_ENABLED`          | `true`        | Enable AI features                       |
| `OPENROUTER_API_KEY`  | -             | OpenRouter API key for AI                |
| `MINIO_CONSOLE_PORT`  | `9001`        | Host port for MinIO console              |
| `MEILISEARCH_API_KEY` | `masterkey`   | Meilisearch master key                   |

### Generating Secrets

```bash
# Generate secure random strings
openssl rand -hex 32  # For APP_SECRET
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 24  # For POSTGRES_PASSWORD
```

---

## 4. TLS/SSL Setup

### Option A: Own Certificates

Place your certificate files in the SSL directory:

```bash
mkdir -p tooling/docker/nginx/ssl
cp /path/to/fullchain.pem tooling/docker/nginx/ssl/fullchain.pem
cp /path/to/privkey.pem tooling/docker/nginx/ssl/privkey.pem
```

Or set a custom path via `SSL_CERT_PATH` in `.env`:

```bash
SSL_CERT_PATH=/etc/letsencrypt/live/diary.example.com
```

### Option B: Let's Encrypt (Certbot)

1. **Initial certificate** — temporarily comment out the HTTPS server block or use HTTP-only mode, then:

```bash
# Install certbot on the host
sudo apt install certbot

# Obtain certificate (nginx must be running for ACME challenge)
sudo certbot certonly --webroot \
    -w /var/lib/docker/volumes/librediary_certbot/_data \
    -d diary.example.com

# Copy certificates
sudo cp /etc/letsencrypt/live/diary.example.com/fullchain.pem tooling/docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/diary.example.com/privkey.pem tooling/docker/nginx/ssl/
```

2. **Auto-renewal** — add a cron job:

```bash
# Edit crontab
crontab -e

# Add renewal (checks twice daily, restarts nginx on success)
0 0,12 * * * certbot renew --quiet && \
    cp /etc/letsencrypt/live/diary.example.com/fullchain.pem /path/to/LibreDiary/tooling/docker/nginx/ssl/ && \
    cp /etc/letsencrypt/live/diary.example.com/privkey.pem /path/to/LibreDiary/tooling/docker/nginx/ssl/ && \
    docker compose -f /path/to/LibreDiary/tooling/docker/docker-compose.production.yml exec nginx nginx -s reload
```

### Option C: HTTP-Only Mode (No TLS)

For local testing or environments where TLS is terminated upstream (e.g. Cloudflare, load balancer), use the HTTP-only compose override. No certificates are required:

```bash
# Build
docker compose -f tooling/docker/docker-compose.production.yml build

# Start in HTTP-only mode
docker compose \
    -f tooling/docker/docker-compose.production.yml \
    -f tooling/docker/docker-compose.local.yml \
    up -d
```

This swaps the nginx config to serve everything over port 80 without any TLS directives.

---

## 5. Building & Running

All commands use the `-f` flag to specify the production compose file:

```bash
# Set the compose file alias (optional, for convenience)
export COMPOSE_FILE=tooling/docker/docker-compose.production.yml

# Build all images
docker compose -f tooling/docker/docker-compose.production.yml build

# Start all services (detached)
docker compose -f tooling/docker/docker-compose.production.yml up -d

# View logs
docker compose -f tooling/docker/docker-compose.production.yml logs -f

# View logs for a specific service
docker compose -f tooling/docker/docker-compose.production.yml logs -f server

# Stop all services
docker compose -f tooling/docker/docker-compose.production.yml down

# Rebuild a single service
docker compose -f tooling/docker/docker-compose.production.yml build server
docker compose -f tooling/docker/docker-compose.production.yml up -d server
```

---

## 6. Database Migrations

Migrations run **automatically** on every container start via the Docker entrypoint script. This includes:

1. **Prisma migrations** (`prisma migrate deploy`) — schema changes
2. **Custom SQL migrations** — search vectors and other extensions
3. **Database seed** — creates the super admin account on first boot (idempotent; skips if admin exists)

To run migrations manually (e.g. for debugging):

```bash
docker compose -f tooling/docker/docker-compose.production.yml exec server \
    npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma
```

---

## 7. Optional Services

### MinIO (S3-compatible storage)

Enable MinIO for S3-compatible file storage instead of local disk:

```bash
# Start with MinIO
docker compose -f tooling/docker/docker-compose.production.yml --profile storage up -d

# Set in .env
STORAGE_TYPE=minio
STORAGE_S3_ENDPOINT=http://minio:9000
STORAGE_S3_BUCKET=librediary
STORAGE_S3_ACCESS_KEY=minioadmin
STORAGE_S3_SECRET_KEY=minioadmin
```

The MinIO console is accessible at `http://your-server:9001` (configurable via `MINIO_CONSOLE_PORT`).

### Meilisearch (Full-text search)

Enable Meilisearch for enhanced search with typo tolerance:

```bash
# Start with Meilisearch
docker compose -f tooling/docker/docker-compose.production.yml --profile search up -d

# Set in .env
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=your-secure-master-key
```

### Both optional services

```bash
docker compose -f tooling/docker/docker-compose.production.yml \
    --profile storage --profile search up -d
```

---

## 8. Updating

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose -f tooling/docker/docker-compose.production.yml build

# Restart services (migrations run automatically on server start)
docker compose -f tooling/docker/docker-compose.production.yml up -d
```

---

## 9. Backup & Restore

### Application Backups

LibreDiary has a built-in backup system. Enable it in `.env`:

```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *        # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_TYPE=LOCAL
```

Backups are stored in the `server_backups` volume, mounted at `/app/backups` inside the container.

### Volume Backups

Back up Docker volumes directly for disaster recovery:

```bash
# Backup PostgreSQL data
docker run --rm \
    -v librediary_postgres_prod:/data:ro \
    -v $(pwd)/backups:/backup \
    alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /data .

# Backup uploaded files
docker run --rm \
    -v librediary_uploads_prod:/data:ro \
    -v $(pwd)/backups:/backup \
    alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

### PostgreSQL Dump

```bash
docker compose -f tooling/docker/docker-compose.production.yml exec postgres \
    pg_dump -U librediary librediary > backup-$(date +%Y%m%d).sql
```

### Restore PostgreSQL

```bash
docker compose -f tooling/docker/docker-compose.production.yml exec -T postgres \
    psql -U librediary librediary < backup-20260211.sql
```

---

## 10. Troubleshooting

### Services not starting

```bash
# Check service status
docker compose -f tooling/docker/docker-compose.production.yml ps

# Check logs for errors
docker compose -f tooling/docker/docker-compose.production.yml logs server
docker compose -f tooling/docker/docker-compose.production.yml logs nginx
```

### Database connection errors

- Ensure `POSTGRES_PASSWORD` is set in `.env`
- Check that the postgres container is healthy: `docker compose ... ps postgres`
- The server automatically uses `postgres:5432` (internal hostname) — do not change `DATABASE_URL` manually

### nginx returns 502 Bad Gateway

- The server container may still be starting. Check health: `docker compose ... ps server`
- Verify the server logs: `docker compose ... logs server`

### WebSocket connections failing

- Ensure nginx is routing `/collaboration/` to the server
- Check that the WebSocket upgrade headers are being passed through
- Verify there are no intermediate proxies stripping upgrade headers

### TLS certificate issues

- Verify certificate files exist: `ls -la tooling/docker/nginx/ssl/`
- Ensure `fullchain.pem` contains the full chain (server cert + intermediate)
- Check nginx logs: `docker compose ... logs nginx`

### File upload failures

- Check `client_max_body_size` in nginx config (default: 50m)
- Verify the `server_uploads` volume is mounted correctly
- Check disk space: `df -h`

---

## 11. Production Checklist

- [ ] Strong, unique `POSTGRES_PASSWORD` set
- [ ] Strong, unique `APP_SECRET` set (min 32 characters)
- [ ] Strong, unique `SESSION_SECRET` set (min 32 characters)
- [ ] `APP_URL` and `API_URL` set to production domain with HTTPS
- [ ] `FRONTEND_URL` set to production frontend URL (for OAuth redirects)
- [ ] `DOMAIN` set for nginx
- [ ] Valid TLS certificates installed
- [ ] SMTP configured for email features (password reset, invitations)
- [ ] Firewall configured — only ports 80 and 443 open
- [ ] Regular backup schedule configured
- [ ] MinIO credentials changed from defaults (if using MinIO)
- [ ] Meilisearch API key changed from default (if using Meilisearch)
- [ ] OAuth credentials configured (if using GitHub/Google login)
- [ ] Log rotation configured on host
- [ ] Monitoring/alerting set up for service health

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
