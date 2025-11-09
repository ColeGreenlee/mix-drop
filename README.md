# MixDrop 🎵

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
git clone <your-repo-url>
cd mix-drop

# Start all services (app, MinIO, Redis, mock OAuth)
docker-compose up --build

# Visit http://localhost:3000
```

That's it! The mock OAuth server lets you sign in with any credentials.

### Services & Ports

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| MixDrop App | 3000 | Main application | N/A |
| MinIO API | 9000 | S3-compatible storage | minioadmin / minioadmin |
| MinIO Console | 9001 | Storage management UI | minioadmin / minioadmin |
| Mock OAuth | 8080 | Authentication (dev only) | Any credentials work |
| Redis | 6379 | Caching layer | No auth (localhost only) |

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

3. **Sign in** - Click "Sign In" and enter any email/username (mock OAuth accepts anything)

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

**Step 2: Deploy with Docker Compose**

```bash
# Start all services (PostgreSQL, Redis, App)
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
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

### Logs

**View application logs:**
```bash
docker-compose logs -f app
```

**View all service logs:**
```bash
docker-compose logs -f
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
