# MixDrop 🎵

[![Tests](https://github.com/ColeGreenlee/mix-drop/actions/workflows/test.yml/badge.svg)](https://github.com/ColeGreenlee/mix-drop/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern, self-hosted platform for sharing DJ mixes with friends. Think SoundCloud, but private and under your control.

## Features

- 🎵 **Upload & Stream** - Share 30-60 minute DJ mixes with high-quality audio
- 🌊 **Waveform Visualization** - See audio waveforms on every mix card
- 🎨 **Beautiful UI** - Earthy color theme (warm tones in light mode, evergreen forest in dark)
- 📱 **Mobile-First** - Responsive design with lock-screen playback controls
- 🔐 **OAuth SSO** - Integrate with your existing authentication provider
- 🎭 **Private/Public Mixes** - Control who can see your content
- ⚡ **Redis Caching** - Fast page loads with intelligent caching
- 🐳 **Docker Ready** - One-command deployment with docker-compose
- 🎼 **Persistent Player** - Audio continues playing while browsing (like Spotify)
- 🌓 **Dark Mode** - Light, dark, and system theme options
- ✏️ **Edit & Delete** - Full control over your uploads

## Quick Start

### Fastest Way: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/ColeGreenlee/mix-drop.git
cd mix-drop

# Start all services (app, MinIO, Redis, mock OAuth)
docker-compose up --build

# Visit http://localhost:3000
```

That's it! The mock OAuth server lets you sign in with any credentials.

### Using Pre-built Docker Images

MixDrop automatically builds and publishes Docker images to GitHub Container Registry (GHCR) on every commit.

```bash
# Pull the latest image
docker pull ghcr.io/colegreenlee/mix-drop:latest

# Or use a specific version
docker pull ghcr.io/colegreenlee/mix-drop:v1.0.0
```

Available image tags:
- `latest` - Latest commit on main branch
- `main` - Main branch builds
- `v*` - Semantic version tags (e.g., v1.0.0, v1.1.0)
- `main-<sha>` - Specific commit SHA

### Services & Ports

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| MixDrop App | 3000 | Main application | N/A |
| Grafana | 3001 | Observability dashboards | Anonymous (dev) / admin (prod) |
| MinIO API | 9000 | S3-compatible storage | minioadmin / minioadmin |
| MinIO Console | 9001 | Storage management UI | minioadmin / minioadmin |
| Mock OAuth | 8080 | Authentication (dev only) | Any credentials work |
| Redis | 6379 | Caching layer | No auth (localhost only) |
| Loki | 3100 | Log aggregation | No auth (internal) |

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 10 or later
- **Docker** & Docker Compose (for containerized deployment)
- **Git** for version control

## Installation & Setup

1. **Clone and start**
   ```bash
   git clone <your-repo>
   cd mix-drop
   docker-compose up --build
   ```

2. **Access the application**
   - App: http://localhost:3000
   - MinIO Console: http://localhost:9001
   - Mock OAuth: http://localhost:8080/default/.well-known/openid-configuration

3. **Sign in** - Click "Sign In" button to use OAuth (mock OAuth accepts any credentials)

## Production Deployment

### Prerequisites

**Required:**
- Domain name with DNS configured
- Production OAuth provider (Keycloak, Auth0, Okta, Google, etc.)
- AWS S3 account OR other S3-compatible service
- Server with Docker and Docker Compose

**Recommended:**
- Reverse proxy for HTTPS (Caddy or Nginx)
- Let's Encrypt for SSL certificate

### Simple Production Deployment

MixDrop uses a single docker-compose file for production that includes PostgreSQL and Redis.

**Step 1: Create Environment File**

```bash
# Copy and edit with your production values
cp .env.example .env.production
```

Required production environment variables:
- `POSTGRES_PASSWORD` - Database password (generate with `openssl rand -base64 32`)
- `REDIS_PASSWORD` - Redis password (generate with `openssl rand -base64 32`)
- `NEXTAUTH_SECRET` - Session secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your public URL (e.g., `https://mixdrop.yourdomain.com`)
- `OAUTH_*` - Your production OAuth provider credentials
- `S3_*` - Your production S3 credentials (AWS S3 or other)
- `GRAFANA_ADMIN_PASSWORD` - Grafana admin password (generate with `openssl rand -base64 32`)
- `GRAFANA_SECRET_KEY` - Grafana encryption key (generate with `openssl rand -base64 32`)

**Step 2: Deploy with Docker Compose**

MixDrop publishes pre-built Docker images to GitHub Container Registry (GHCR) on every commit to main.

```bash
# Pull the latest image
docker pull ghcr.io/colegreenlee/mix-drop:latest

# Start all services (PostgreSQL, Redis, App)
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

**Alternative: Build locally** (if you want to customize the image):
```bash
# Edit docker-compose.prod.yml and uncomment the build section
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**Step 3: Set Up Reverse Proxy for HTTPS**

The app runs on `localhost:3000` by default. Use a reverse proxy to handle HTTPS:

**Option A: Caddy (Easiest - Auto SSL)**

```bash
# Install Caddy
# https://caddyserver.com/docs/install

# Create Caddyfile
cat > Caddyfile <<EOF
mixdrop.yourdomain.com {
    reverse_proxy localhost:3000
}
EOF

# Start Caddy (automatically gets Let's Encrypt cert)
caddy run
```

**Option B: Nginx with Certbot**

```bash
# Install nginx and certbot
sudo apt install nginx certbot python3-certbot-nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/mixdrop

# Add this config:
server {
    listen 80;
    server_name mixdrop.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/mixdrop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d mixdrop.yourdomain.com
```

**That's it!** Your production instance is now running.

### Complete Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `file:./data/mixdrop.db` | SQLite database path or PostgreSQL connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection string for caching |
| `S3_ENDPOINT` | ✅ | `http://localhost:9000` | S3 API endpoint (internal for Docker) |
| `S3_PUBLIC_ENDPOINT` | ✅ | `http://localhost:9000` | S3 endpoint accessible from browsers |
| `S3_BUCKET` | ✅ | `mixdrop` | S3 bucket name for storing mixes |
| `S3_ACCESS_KEY` | ✅ | `minioadmin` | S3 access key ID |
| `S3_SECRET_KEY` | ✅ | `minioadmin` | S3 secret access key |
| `S3_REGION` | ❌ | `us-east-1` | AWS region (required for AWS S3) |
| `S3_FORCE_PATH_STYLE` | ❌ | `true` | Use path-style URLs (required for MinIO) |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | Public URL of your application |
| `NEXTAUTH_SECRET` | ✅ | Generate with `openssl rand -base64 32` | Session encryption secret (change in production!) |
| `OAUTH_CLIENT_ID` | ✅ | `mixdrop` | OAuth provider client ID |
| `OAUTH_CLIENT_SECRET` | ✅ | `mixdrop-secret` | OAuth provider client secret |
| `OAUTH_ISSUER` | ✅ | `http://localhost:8080/default` | OAuth issuer URL |
| `OAUTH_AUTHORIZATION_URL` | ✅ | OAuth provider's authorize endpoint | Full authorization URL |
| `OAUTH_TOKEN_URL` | ✅ | OAuth provider's token endpoint | Full token exchange URL |
| `OAUTH_USERINFO_URL` | ✅ | OAuth provider's userinfo endpoint | Full user info URL |
| `LOG_LEVEL` | ❌ | `debug` (dev) / `info` (prod) | Logging verbosity: debug, info, warn, error |
| `GRAFANA_ADMIN_PASSWORD` | ✅ (prod) | `admin` (dev only) | Grafana dashboard admin password |
| `GRAFANA_ADMIN_USER` | ❌ | `admin` | Grafana admin username |
| `GRAFANA_SECRET_KEY` | ✅ (prod) | Auto-generated | Grafana encryption secret |
| `GRAFANA_ROOT_URL` | ❌ | `http://localhost:3001` | Public URL for Grafana (if exposed) |

### OAuth Provider Setup

#### Using Auth0

1. Create application in Auth0 dashboard
2. Set callback URL: `https://yourdomain.com/api/auth/callback/custom-sso`
3. Enable OIDC Conformant
4. Configure environment variables:

```bash
OAUTH_CLIENT_ID="<from-auth0>"
OAUTH_CLIENT_SECRET="<from-auth0>"
OAUTH_ISSUER="https://your-tenant.auth0.com"
OAUTH_AUTHORIZATION_URL="https://your-tenant.auth0.com/authorize"
OAUTH_TOKEN_URL="https://your-tenant.auth0.com/oauth/token"
OAUTH_USERINFO_URL="https://your-tenant.auth0.com/userinfo"
```

#### Using Google OAuth

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/custom-sso`
3. Configure:

```bash
OAUTH_CLIENT_ID="<google-client-id>"
OAUTH_CLIENT_SECRET="<google-client-secret>"
OAUTH_ISSUER="https://accounts.google.com"
OAUTH_AUTHORIZATION_URL="https://accounts.google.com/o/oauth2/v2/auth"
OAUTH_TOKEN_URL="https://oauth2.googleapis.com/token"
OAUTH_USERINFO_URL="https://openidconnect.googleapis.com/v1/userinfo"
```

## S3/MinIO Backups

**Enable versioning:**
```bash
mc version enable local/mixdrop
```

**Backup to different bucket/region:**
```bash
mc mirror local/mixdrop remote/mixdrop-backup
```


## Observability & Monitoring

MixDrop includes a complete observability stack powered by **Grafana Loki** for centralized logging and **Grafana** for visualization.

### Architecture

- **Structured Logging** - Pino-based JSON logging with request correlation
- **Log Aggregation** - Loki collects all application logs
- **Log Shipping** - Promtail automatically ships Docker logs to Loki
- **Visualization** - Grafana provides pre-built dashboards
- **Retention** - 7-day log retention (configurable)

### Quick Start

The observability stack is included in both development and production docker-compose files:

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

**Access Grafana:**
- Development: http://localhost:3001
- Production: http://localhost:3001 (expose via reverse proxy)

**Default Credentials:**
- Development: Anonymous access enabled (no login required)
- Production: admin / `$GRAFANA_ADMIN_PASSWORD` (set in .env.production)

### Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| Grafana | 3001 | Dashboards and visualization |
| Loki | 3100 | Log aggregation backend |
| Promtail | - | Log collector (no exposed port) |

### Pre-built Dashboards

MixDrop includes 5 production-ready Grafana dashboards:

1. **Application Overview** (`/d/mixdrop-overview`)
   - Request rates and error rates
   - HTTP methods distribution
   - Response status codes
   - Recent application logs

2. **Upload Analytics** (`/d/mixdrop-uploads`)
   - Upload success/failure rates
   - Upload trends over time
   - Upload errors breakdown
   - Rate limit monitoring

3. **Cache Performance** (`/d/mixdrop-cache`)
   - Cache hit/miss ratios
   - Cache operation rates
   - Redis connection health
   - Cache-related errors

4. **Error Monitoring** (`/d/mixdrop-errors`)
   - Error and warning counts
   - Error rates over time
   - Errors grouped by operation
   - Detailed error logs

5. **Database Performance** (`/d/mixdrop-database`)
   - Query rates and counts
   - Slow query detection (>100ms)
   - Database errors and warnings
   - Query distribution by model

### Structured Logging

All application logs are structured JSON with contextual information:

**Log Levels:**
- `error` - Errors and exceptions
- `warn` - Warnings and anomalies
- `info` - Important events (uploads, auth, operations)
- `debug` - Detailed debugging (queries, cache ops)

**Log Context:**
Every log entry includes:
- `requestId` - Unique ID for request tracing
- `userId` - User performing the action (when applicable)
- `timestamp` - ISO 8601 timestamp
- `level` - Log severity level
- Operation-specific context (mixId, cacheKey, queryDuration, etc.)

**Example Queries in Grafana:**

```logql
# View all errors in the last hour
{service="app"} |~ "level.*error"

# Find slow database queries (>100ms)
{service="app"} |= "DB Query" | json | duration > 100

# Track specific user's actions
{service="app"} | json | userId="user-123"

# Monitor upload success rate
{service="app"} |= "upload_mix" |~ "level.*info"

# Cache hit ratio
{service="app"} |= "Cache get" |= "HIT"
```

### Configuration

**Log Level:**
Set `LOG_LEVEL` environment variable:
```bash
# Development - verbose logging
LOG_LEVEL=debug

# Production - important events only
LOG_LEVEL=info
```

**Log Retention:**
Edit `config/loki-config.yml` to adjust retention:
```yaml
limits_config:
  retention_period: 168h  # 7 days
```

**Grafana Authentication (Production):**
Set in `.env.production`:
```bash
GRAFANA_ADMIN_PASSWORD=your-secure-password
GRAFANA_ADMIN_USER=admin
GRAFANA_SECRET_KEY=$(openssl rand -base64 32)
GRAFANA_ROOT_URL=https://grafana.yourdomain.com
```

### Exposing Grafana (Production)

**Option A: Reverse Proxy (Recommended)**

Add to your Caddy or Nginx configuration:

```caddy
# Caddyfile
grafana.yourdomain.com {
    reverse_proxy localhost:3001
}
```

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name grafana.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Option B: Direct Access (Development Only)**

For development, Grafana is accessible at `http://localhost:3001` with anonymous access enabled.

### Advanced Usage

**Custom Dashboards:**
1. Create dashboards in Grafana UI
2. Export JSON via Settings → JSON Model
3. Save to `config/grafana/dashboards/`
4. Restart Grafana to load

**Alert Rules:**
Add LogQL alert rules in Grafana:
- High error rates
- Upload failures
- Database slow queries
- Cache miss spikes

**Log Filtering:**
Use LogQL to filter logs by any field:
```logql
# Specific operation
{service="app"} | json | operation="fetch_mixes"

# Status code range
{service="app"} | json | statusCode >= 400

# Multiple conditions
{service="app"} | json | level="error" | context="upload_mix"
```

## Monitoring & Maintenance

### Health Checks

**Check application:**
```bash
curl http://localhost:3000
```

**Check Redis:**
```bash
redis-cli ping  # Should return PONG
```

**Check MinIO:**
```bash
curl http://localhost:9000/minio/health/live
```

**Check Loki:**
```bash
curl http://localhost:3100/ready
```

**Check Grafana:**
```bash
curl http://localhost:3001/api/health
```

### Logs

**View application logs:**
```bash
docker-compose logs -f app
```

**View all service logs:**
```bash
docker-compose logs -f
```

**View observability stack logs:**
```bash
docker-compose logs -f loki promtail grafana
```

### Database Maintenance

**Open Prisma Studio** (visual database editor):
```bash
pnpm prisma studio
```

**Reset database** (development only - destroys all data):
```bash
pnpm prisma migrate reset
```

**Check migration status:**
```bash
pnpm prisma migrate status
```

## Testing

MixDrop has **280 unit tests with 100% pass rate** covering all critical functionality. Tests run automatically in CI/CD, blocking deployments if they fail.

### Quick Start

```bash
# Run all tests
pnpm test

# Run unit tests only (fast - 30 seconds)
pnpm test:unit

# Run integration tests (requires Docker)
pnpm test:integration

# Generate coverage report
pnpm test:coverage

# Watch mode for development
pnpm test:watch

# Interactive test UI
pnpm test:ui

# Type checking
pnpm type-check
```

### Test Suite Overview

| Type | Files | Tests | Purpose |
|------|-------|-------|---------|
| **Unit Tests** | 12 files | 192 tests | Utilities, auth, caching, rate-limiting, S3 |
| **Integration Tests** | 4 files | 50+ tests | API routes with real PostgreSQL/Redis/MinIO |
| **Component Tests** | 5 files | 60+ tests | Audio player, dialogs, UI components |
| **Service Layer** | 1 file | 22 tests | Upload validation & orchestration |
| **Total** | **22 files** | **324+ tests** | **Complete coverage** |

### Writing Tests

**Example Unit Test:**
```typescript
import { describe, it, expect } from "vitest";
import { cacheGet, cacheSet } from "./cache";

describe("cache", () => {
  it("should return parsed value on cache hit", async () => {
    const testData = { id: "1", name: "Test" };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));

    const result = await cacheGet("test-key");

    expect(result).toEqual(testData);
  });
});
```

**Example Component Test:**
```typescript
import { renderHook, act } from "@testing-library/react";
import { useAudioPlayer } from "./audio-player-context";

it("should play mix when playMix is called", () => {
  const { result } = renderHook(() => useAudioPlayer(), { wrapper });

  act(() => result.current.playMix(mix));

  expect(result.current.currentMix).toEqual(mix);
  expect(result.current.isPlayerOpen).toBe(true);
});
```

### Test Utilities & Mocking

**Mock Data Factories** (`tests/utils/test-factories.ts`):
```typescript
const user = createMockUser({ role: "admin" });
const mix = createMockMix({ uploaderId: user.id });
const playlist = createMockPlaylist({ userId: user.id });
```

**Session Mocking** (`tests/utils/mock-session.ts`):
```typescript
const userSession = createMockUserSession();
const adminSession = createMockAdminSession();
```

**Mock Services** (`tests/mocks/`):
- S3 client (in-memory storage)
- Redis client (in-memory cache)
- Prisma client (vitest-mock-extended)

### Coverage Targets

- **Overall**: 80% enforced in CI/CD
- **Utilities**: 90%+
- **Core Logic**: 90%+
- **Service Layer**: 95%+
- **API Routes**: 85%+
- **Components**: 70%+

### CI/CD Integration

Tests run automatically via GitHub Actions on every push and PR:

1. ✅ **Lint** - ESLint validation
2. ✅ **Type Check** - TypeScript compilation
3. ✅ **Unit Tests** - Fast isolated tests (~30s)
4. ✅ **Integration Tests** - With PostgreSQL & Redis services
5. ✅ **Coverage Report** - Uploaded to Codecov
6. ✅ **PR Comment** - Coverage stats posted to PR
7. ❌ **Fail Build** - If tests fail or coverage < 80%

Docker images only build and publish if all tests pass.

### Key Testing Features

- **Fast Execution**: Unit tests run in ~30 seconds
- **Watch Mode**: Auto-rerun on file changes
- **Dependency Injection**: S3 client mockable for testing
- **Service Layer**: Business logic extracted for testability
- **Docker Integration**: Real services via Testcontainers
- **Type-Safe Mocks**: TypeScript throughout

For architecture details and testing patterns, see [CLAUDE.md](./CLAUDE.md#testing-strategy)
