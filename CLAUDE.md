# MixDrop Architecture Guide for Claude Code

This guide explains the critical architecture, design patterns, and implementation details of MixDrop. Use this to understand the codebase structure and make informed decisions when implementing changes.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Authentication System](#authentication-system)
3. [Global State Management](#global-state-management)
4. [Caching Strategy](#caching-strategy)
5. [File Storage](#file-storage)
6. [Database Architecture](#database-architecture)
7. [Logging & Observability](#logging--observability)
8. [Key Design Patterns](#key-design-patterns)
9. [Important Conventions](#important-conventions)
10. [Development Workflow](#development-workflow)
11. [Critical Implementation Details](#critical-implementation-details)

---

## High-Level Architecture

### Stack Overview

**Frontend:**
- Next.js 15 (App Router) with React Server Components
- Tailwind CSS + shadcn/ui components
- WaveSurfer.js for audio waveform visualization
- Context API for global audio player state

**Backend:**
- Next.js API Routes (App Router pattern: app/api/*/route.ts)
- Prisma ORM with PostgreSQL
- NextAuth.js v4 for authentication
- Redis (ioredis) for caching layer

**Infrastructure:**
- S3-compatible storage (MinIO for dev, AWS S3 for prod)
- Grafana + Loki + Promtail for observability
- Docker Compose for local development
- Multi-stage Docker build for production

**Key Libraries:**
- music-metadata - Extract audio duration and metadata
- pino - Structured JSON logging
- @dnd-kit/* - Drag-and-drop playlist reordering


## Authentication System

### NextAuth.js Configuration (lib/auth.ts)

MixDrop uses **OAuth-only authentication** via NextAuth.js v4 with a custom OAuth provider integration.

### Database Sessions

```typescript
session: { strategy: "database" } // OAuth supports database sessions
```

**Benefits of database sessions:**
- Can invalidate sessions server-side (better security)
- No JWT size limitations
- More control over session lifecycle
- Audit trail of active sessions

### OAuth Provider Configuration

The OAuth provider is configured in `lib/auth.ts` with the following environment variables:
- `OAUTH_CLIENT_ID` - OAuth client identifier
- `OAUTH_CLIENT_SECRET` - OAuth client secret
- `OAUTH_ISSUER` - OAuth issuer URL (optional, for OIDC discovery)
- `OAUTH_AUTHORIZATION_URL` - Authorization endpoint
- `OAUTH_TOKEN_URL` - Token endpoint
- `OAUTH_USERINFO_URL` - User info endpoint

For local development, a mock OAuth server is provided via Docker Compose that accepts any credentials.

### Admin Designation (Two Methods)

1. **Environment Variable:** `ADMIN_EMAILS=admin@example.com,other@example.com` - Users with these emails automatically get admin role on first sign-in
2. **First User Fallback:** First user to sign in automatically becomes admin (fallback if ADMIN_EMAILS not set)

### Route Protection Patterns

**Server Components:**
```typescript
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";
const session = await requireAuth(); // Redirects if not authenticated
const session = await requireAdmin(); // Redirects if not admin
```

**API Routes:**
```typescript
import { getSession } from "@/lib/auth-helpers";
import { unauthorized, forbidden } from "@/lib/api-errors";

const session = await getSession();
if (!session?.user) return unauthorized();
if (session.user.role !== "admin") return forbidden();
```

**Layout-Based Protection (preferred for admin sections):**
```typescript
// app/admin/layout.tsx - Protects all /admin/* routes
export default async function AdminLayout({ children }) {
  await requireAdmin();
  return <div>{children}</div>;
}
```


## Global State Management

### Audio Player Context (components/audio-player-context.tsx)

The audio player is a **global persistent component** that remains mounted while users navigate (Spotify-like experience).

**Provider Hierarchy:**
```
SessionProvider (NextAuth) → ThemeProvider → AudioPlayerProvider → App + AudioPlayer
```

**State Interface:**
```typescript
interface AudioPlayerContextType {
  currentMix: Mix | null;       // Currently playing
  queue: Mix[];                  // Upcoming mixes
  isPlayerOpen: boolean;         // Player visibility
  isQueueOpen: boolean;          // Queue drawer visibility
  
  playMix: (mix: Mix) => void;           // Replace current
  addToQueue: (mix: Mix) => void;        // Add to queue
  removeFromQueue: (index: number) => void;
  playNext: () => void;                  // Auto-advance
  reorderQueue: (from, to) => void;      // Drag-and-drop
  toggleQueue: () => void;
  closePlayer: () => void;
  clearQueue: () => void;
}
```

**Key Behaviors:**
- Duplicate prevention: Adding existing mix is silently ignored
- Auto-play next: playNext() advances to next or closes player
- Global persistence: Survives page navigation


## Caching Strategy

### Redis Caching Layer (lib/cache.ts)

**Architecture:** Graceful degradation - app continues if Redis unavailable

**Cache Functions:**
```typescript
await cacheGet<T>(key)                    // Returns null on miss/error
await cacheSet(key, value, ttl?)          // TTL in seconds
await cacheDelete(key)
await cacheDeletePattern("mixes:list:*")  // Invalidate all matching
```

**Cache Key Patterns (lib/cache.ts):**
```typescript
CacheKeys = {
  mixes: (page) => `mixes:list:page:${page}`,
  mix: (id) => `mix:${id}`,
  streamUrl: (mixId, type) => `stream:${mixId}:${type}`,
  waveformPeaks: (mixId) => `waveform:${mixId}`,
}
```

**TTL Strategy (lib/constants.ts):**
```typescript
CACHE_TTL = {
  MIXES_LIST: 300,      // 5 min - feed changes frequently
  MIX_DETAIL: 3600,     // 1 hour - metadata rarely changes
  STREAM_URL: 1800,     // 30 min - presigned URL expiry
  WAVEFORM_PEAKS: 86400, // 24 hours - never changes
}
```

**Cache-Aside Pattern:**
```typescript
// Try cache first
const cached = await cacheGet(key);
if (cached) return NextResponse.json(cached);

// Cache miss - fetch from DB
const data = await prisma.mix.findMany({...});

// Store for next request
await cacheSet(key, data, CACHE_TTL.MIXES_LIST);
return NextResponse.json(data);
```

**Invalidation Strategy:**
- Upload new mix: `cacheDeletePattern("mixes:list:*")` (all feed pages)
- Update mix: `cacheDelete(CacheKeys.mix(id))` (single mix)
- Delete mix: Invalidate both single + list caches

**Authentication-Aware Caching:**
```typescript
const cacheKey = isAuthenticated 
  ? CacheKeys.mixes(1) 
  : `${CacheKeys.mixes(1)}:public`;
```


## File Storage

### S3/MinIO Integration (lib/s3.ts)

**Key Functions:**
```typescript
await uploadToS3(key, buffer, contentType);
await deleteFromS3(key);
const url = await getPresignedUrl(key, 3600); // 1 hour default
const key = generateStorageKey(userId, filename, "mixes");
// Result: "mixes/{userId}/{timestamp}-{random}.mp3"
```

**Public vs Internal Endpoints (Critical for Docker):**

```typescript
// Server uses internal Docker endpoint
const url = await getSignedUrl(s3Client, command);

// Replace with public endpoint for browsers
return url.replace(process.env.S3_ENDPOINT, S3_PUBLIC_ENDPOINT);
```

**Why Two Endpoints?**
- S3_ENDPOINT: Internal Docker network (e.g., http://minio:9000)
- S3_PUBLIC_ENDPOINT: Browser-accessible (e.g., http://localhost:9000)

Without replacement, browsers would try to fetch from http://minio:9000 (Docker name) which fails.

**Storage Structure:**
```
{bucket}/
├── mixes/{userId}/{timestamp}-{random}.{ext}    # Audio files
└── covers/{userId}/{timestamp}-{random}.{ext}   # Cover art
```


## Database Architecture

### Prisma + PostgreSQL (prisma/schema.prisma)

**Key Models:**

```prisma
User (NextAuth OAuth)
├── id, email, name, image, emailVerified
├── role ("user" | "admin")
├── status ("active" | "suspended" | "banned")
└── Relations: mixes, playlists, auditLogs, sessions, accounts

Mix (core content)
├── title, artist, description, duration, fileSize
├── storageKey (S3 audio path)
├── coverArtKey (S3 cover path)
├── waveformPeaks (JSON array)
├── isPublic (boolean)
└── Relations: uploader, playlistMixes

Playlist
├── name, description, isPublic
└── Relations: user, mixes (through PlaylistMix)

PlaylistMix (join table with ordering)
├── playlistId, mixId
├── order (for drag-and-drop sequencing)
└── @@unique([playlistId, mixId]) - no duplicates

AuditLog (admin actions)
├── action ("user.role.change", etc.)
├── actorId, targetId, details (JSON)
```

**Automatic Query Logging (lib/prisma.ts):**
```typescript
client.$on("query", (e) => {
  logger.debug({
    database: { query: e.query, duration: e.duration }
  }, `DB Query: ${e.target} - ${e.duration}ms`);
});
```

**Important Indexes:**
```prisma
Mix {
  @@index([createdAt(sort: Desc)])  # Feed queries
  @@index([uploaderId])              # User profile
  @@index([isPublic])                # Public filtering
}

PlaylistMix {
  @@index([playlistId, order])       # Ordered queries
}
```

**Migration Workflow:**
```bash
pnpm prisma migrate dev --name description   # Create migration
pnpm prisma migrate deploy                   # Apply (prod)
pnpm db:seed                                 # Create default admin
pnpm prisma studio                           # Visual DB editor
```


## Logging & Observability

### Structured Logging with Pino + Loki (lib/logger.ts)

**Log Levels:**
- **debug:** DB queries, cache ops (verbose)
- **info:** Requests, uploads, auth events
- **warn:** Rate limits, anomalies
- **error:** Exceptions, failures

**Automatic Context Injection:**
- requestId: Generated in middleware.ts
- userId: Set during auth
- timestamp: ISO 8601
- env: development/production

**Helper Functions:**
```typescript
logError(error, { context: "upload_mix", mixId });
logAuth("login", userId, { provider: "credentials" });
logRateLimit("upload", allowed, remaining);
logS3("upload", key, size, duration);
logDatabase("query", "Mix", duration);
logCache("get", key, hit);
```

**Observability Stack:**
```
Next.js (Pino) → Docker Logs → Promtail → Loki → Grafana
```

**Pre-built Dashboards:**
1. Application Overview - Request rates, status codes
2. Upload Analytics - Success/failure rates
3. Cache Performance - Hit/miss ratios
4. Error Monitoring - Errors grouped by operation
5. Database Performance - Query rates, slow queries

**Log Correlation via requestId:**
```logql
{service="app"} | json | requestId="abc-123"
```

**Configuration:**
- Development: Pretty-printed console (pino-pretty)
- Production: JSON output to Loki
- Retention: 7 days (config/loki-config.yml)


## Key Design Patterns

### 1. API Route Structure

**Standard Pattern:**
```
app/api/
├── [resource]/
│   ├── route.ts          # GET (list) / POST (create)
│   └── [id]/
│       ├── route.ts      # GET/PATCH/DELETE
│       └── [action]/route.ts
```

**Error Handling:**
```typescript
import { handleApiError, badRequest, notFound } from "@/lib/api-errors";

try {
  if (!resource) return notFound("Resource not found");
  return NextResponse.json({ data: resource });
} catch (error) {
  return handleApiError(error, "fetch_resource", 500);
}
```

### 2. Waveform Precomputation

**Upload Flow:**
```typescript
// 1. Read audio into buffer
const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

// 2. Generate waveform peaks (500 samples)
const waveformPeaks = generateWaveformPeaks(audioBuffer, 500);

// 3. Store as JSON in database
await prisma.mix.create({
  data: { waveformPeaks: JSON.stringify(waveformPeaks) }
});
```

**Why During Upload:**
- Waveform generation is CPU-intensive
- Upload once, play many times
- Instant loading on mix cards

**Production Note:** lib/waveform.ts generates placeholder data. For production, consider:
- audiowaveform CLI tool
- fluent-ffmpeg
- Web Audio API (client-side)

### 3. Queue System with Ordering

**Playlist Ordering:**
```typescript
// Get current max order
const maxOrder = await prisma.playlistMix.aggregate({
  where: { playlistId },
  _max: { order: true },
});

// Add at end
await prisma.playlistMix.create({
  data: {
    playlistId, mixId,
    order: (maxOrder._max.order ?? -1) + 1
  }
});
```

**Client Reordering:**
```typescript
// @dnd-kit/sortable handles drag-and-drop
const reorderQueue = (from, to) => {
  setQueue(prev => {
    const newQueue = [...prev];
    const [removed] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, removed);
    return newQueue;
  });
};
```


## Important Conventions

### 1. Adding New API Routes

**Template:**
```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { handleApiError, unauthorized } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) return unauthorized();
    
    const data = await prisma.resource.findMany();
    logger.info({ operation: "fetch_resource" }, "Fetched");
    
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch_resource", 500);
  }
}
```

### 2. Constants Management (lib/constants.ts)

All magic numbers live here:

```typescript
import { MAX_FILE_SIZES, CACHE_TTL, ERROR_MESSAGES } from "@/lib/constants";

if (file.size > MAX_FILE_SIZES.AUDIO) {
  return badRequest(ERROR_MESSAGES.FILE_TOO_LARGE);
}

await cacheSet(key, value, CACHE_TTL.MIX_DETAIL);
```

### 3. Audit Logging (lib/audit.ts)

```typescript
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

await createAuditLog(
  AUDIT_ACTIONS.USER_ROLE_CHANGE,
  session.user.id,  // Actor
  userId,           // Target
  { oldRole: "user", newRole: "admin" }
);
```

**Note:** Audit failures don't break operations (logged but not thrown)

### 4. Rate Limiting (lib/rate-limit.ts)

```typescript
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitExceeded } from "@/lib/api-errors";

const rateLimit = await checkRateLimit(session.user.id, "upload");
if (!rateLimit.success) {
  const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
  return rateLimitExceeded(retryAfter);
}
```

**Limits (lib/constants.ts):**
- Upload: 5 per hour
- API: 100 per minute


## Development Workflow

### Docker Setup

**Development:**
```bash
docker-compose up --build

# Services:
# - App: http://localhost:3000
# - Grafana: http://localhost:3001
# - MinIO Console: http://localhost:9001
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

**Production:**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Environment Variables

**Required:**
```bash
DATABASE_URL              # PostgreSQL connection
REDIS_URL                 # Redis connection
S3_ENDPOINT               # Internal Docker endpoint
S3_PUBLIC_ENDPOINT        # Browser-accessible endpoint
S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY
NEXTAUTH_URL, NEXTAUTH_SECRET  # Generate: openssl rand -base64 32
```

**Authentication:**
```bash
# OAuth SSO (required)
OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET
OAUTH_ISSUER, OAUTH_AUTHORIZATION_URL
OAUTH_TOKEN_URL, OAUTH_USERINFO_URL

# Admin designation
ADMIN_EMAILS=admin@example.com,other-admin@example.com
```

### Build Process

```bash
# Development
pnpm dev

# Production
pnpm build  # Standalone output
pnpm start

# Database
pnpm prisma migrate dev --name description
pnpm prisma migrate deploy  # Production
pnpm db:seed                # Default admin
pnpm prisma studio          # Visual editor
```

**Docker Multi-Stage Build:**
1. deps: Install with pnpm
2. builder: Generate Prisma, build Next.js
3. runner: Standalone output, run migrations


## Critical Implementation Details

### 1. Database Sessions for OAuth

```typescript
session: { strategy: "database" } // OAuth supports database sessions
```

MixDrop uses database sessions because:
- Can invalidate sessions server-side (logout functionality)
- No JWT size limitations
- Full audit trail of active sessions via Session table
- Better security for multi-device management

**Implication:** Session data stored in database Session table. Can be invalidated immediately by deleting the session record.

### 2. OAuth Provider Configuration

**Location:** lib/auth.ts

OAuth provider is configured for both development and production:
- **Development:** Mock OAuth server (via Docker Compose) accepts any credentials
- **Production:** Configure with your actual OAuth/OIDC provider (Auth0, Keycloak, Google, etc.)

Required OAuth environment variables:
1. `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`
2. `OAUTH_AUTHORIZATION_URL`, `OAUTH_TOKEN_URL`, `OAUTH_USERINFO_URL`
3. Optional: `OAUTH_ISSUER` for OIDC discovery

### 3. Waveform Precomputation Details

**Why During Upload:**
- CPU-intensive processing
- Upload once, play many times
- Instant loading on feed

**Current Implementation:**
lib/waveform.ts generates deterministic peaks from buffer data. Creates realistic-looking waveforms but isn't true audio analysis.

**Production Recommendation:**
- audiowaveform CLI (BBC's tool)
- fluent-ffmpeg with audio filters
- Web Audio API (client-side)

### 4. S3 Endpoint Translation

**Problem:** Docker containers can't use localhost

**Solution:**
```typescript
// Generate with internal endpoint
const url = await getSignedUrl(s3Client, command);

// Replace for browsers
return url.replace(S3_ENDPOINT, S3_PUBLIC_ENDPOINT);
```

**Env Vars:**
```bash
S3_ENDPOINT=http://minio:9000           # Docker internal
S3_PUBLIC_ENDPOINT=http://localhost:9000 # Browser
```

**Production (AWS S3):** Both are same public URL

### 5. Playlist System Architecture

**Three-Table Design:**
```
User → Playlist → PlaylistMix → Mix
```

**Key Features:**
- order field: Enables drag-and-drop
- @@unique([playlistId, mixId]): No duplicates
- Cascade deletes: Playlist deletion removes PlaylistMix entries
- Public/Private: Both Playlist and Mix have isPublic flags


## Quick Reference

### File Locations Cheat Sheet

```
Authentication:
├── lib/auth.ts                      - NextAuth config
├── lib/auth-helpers.ts              - requireAuth, requireAdmin
└── app/api/auth/[...nextauth]/route.ts - Auth handler

Caching:
├── lib/cache.ts                     - Redis helpers
└── lib/constants.ts                 - CACHE_TTL values

Storage:
└── lib/s3.ts                        - S3/MinIO integration

Database:
├── lib/prisma.ts                    - Prisma client
├── prisma/schema.prisma             - Schema
└── prisma/seed.ts                   - Default admin

Logging:
├── lib/logger.ts                    - Pino + helpers
├── lib/audit.ts                     - Audit logging
└── config/loki-config.yml           - Retention config

Error Handling:
├── lib/api-errors.ts                - Error helpers
└── lib/rate-limit.ts                - Rate limiting

Global State:
├── components/audio-player-context.tsx - Player state
└── components/providers.tsx         - Providers wrapper

Configuration:
├── lib/constants.ts                 - Magic numbers
├── .env.example                     - Dev template
└── next.config.ts                   - Next.js config
```

### Common Tasks

**Invalidate cache:**
```typescript
import { cacheDelete, cacheDeletePattern } from "@/lib/cache";
await cacheDelete("mix:123");
await cacheDeletePattern("mixes:list:*");
```

**Check admin role:**
```typescript
import { requireAdmin } from "@/lib/auth-helpers";
const session = await requireAdmin(); // Redirects if not admin
```

**Log with context:**
```typescript
import { logger, logError } from "@/lib/logger";
logger.info({ operation: "upload", mixId }, "Uploaded");
logError(error, { context: "upload", mixId });
```

### Architecture Decisions Summary

**Key Choices:**
1. Database Sessions - Better security and control for OAuth
2. Precomputed Waveforms - CPU-intensive, done during upload
3. Cache-Aside Pattern - Graceful degradation
4. Layout-Based Auth - Admin sections protected at layout level
5. Structured Logging - JSON with context for Loki
6. OAuth-Only Authentication - Industry standard SSO
7. Standalone Build - Docker optimization

**Trade-offs:**
- Database sessions require DB queries (minimal overhead with proper indexing)
- Waveform algorithm is placeholder (needs production solution)
- Rate limiting depends on Redis (fails open if unavailable)

### Debugging

**Resources:**
- Grafana logs: http://localhost:3001
- Redis CLI: docker exec -it mixdrop-redis redis-cli
- Prisma Studio: pnpm prisma studio
- MinIO Console: http://localhost:9001

**Common Issues:**
- "Prisma Client not found" → pnpm prisma generate
- "Redis connection failed" → Check container running
- "S3 access denied" → Verify S3_ACCESS_KEY/SECRET_KEY
- "Admin not working" → Check ADMIN_EMAILS environment variable, or ensure first user has signed in
- "OAuth callback failed" → Verify OAuth environment variables and provider configuration
- "Waveform not showing" → Verify waveformPeaks is valid JSON

---

## Testing Strategy

MixDrop has a comprehensive testing suite with 324+ tests covering critical functionality.

### Testing Framework

**Stack:**
- **Vitest** - Modern, fast test runner (better Next.js 15 support than Jest)
- **@testing-library/react** - Component testing
- **Testcontainers** - Docker-based integration tests
- **vitest-mock-extended** - Advanced mocking
- **@faker-js/faker** - Realistic test data

**Configuration:**
```
vitest.config.ts              # Main config, 80% coverage threshold
vitest.unit.config.ts         # Unit tests (fast, mocked dependencies)
vitest.integration.config.ts  # Integration tests (Docker services)
tests/setup.ts                # Global test setup
.env.test                     # Test environment variables
```

### Test Commands

```bash
pnpm test              # Run all tests
pnpm test:unit         # Unit tests only (fast)
pnpm test:integration  # Integration tests (requires Docker)
pnpm test:coverage     # Generate coverage report
pnpm test:watch        # Watch mode
pnpm test:ui           # Interactive UI
pnpm type-check        # TypeScript validation
```

### Test Structure

**Unit Tests (192 tests):**
- lib/\*.test.ts - Co-located with source files
- Tests utilities, caching, auth, rate-limiting, S3, etc.
- Mocked external dependencies (Redis, S3, Prisma)

**Integration Tests (50+ tests):**
- tests/integration/api/\*.test.ts
- Real PostgreSQL, Redis, MinIO via Testcontainers
- Tests API routes end-to-end

**Component Tests (60+ tests):**
- components/\*.test.tsx
- Audio player context, mix cards, dialogs
- User interaction testing

**Service Layer (22 tests):**
- lib/services/upload-service.ts - Extracted business logic
- Highly testable, reusable, 95% covered

### Test Utilities

**Mock Factories (tests/utils/test-factories.ts):**
```typescript
const user = createMockUser({ role: "admin" });
const mix = createMockMix({ uploaderId: user.id });
const playlist = createMockPlaylist({ userId: user.id });
```

**Session Mocking (tests/utils/mock-session.ts):**
```typescript
const userSession = createMockUserSession();
const adminSession = createMockAdminSession();
```

**Mock Services (tests/mocks/):**
- s3.mock.ts - In-memory S3 client
- redis.mock.ts - In-memory Redis client
- prisma.mock.ts - Database mocking

### Writing Tests

**Pattern to Follow:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { myFunction } from "./my-module";

// Mock dependencies
vi.mock("@/lib/dependency", () => ({ ... }));

describe("myModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something", async () => {
    // Arrange
    const input = setupTestData();

    // Act
    const result = await myFunction(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### CI/CD Integration

**GitHub Actions (.github/workflows/test.yml):**
- Runs on every push to main and PR
- Lint → Type-check → Unit tests with coverage
- Coverage thresholds enforced (80%)
- Blocks deployment if tests fail
- Posts coverage report as PR comment

**Docker Publish Workflow:**
- Depends on tests passing first
- Only builds/pushes if all tests succeed

### Coverage Targets

- **Overall:** 80% minimum (enforced in CI)
- **Utilities:** 90%+
- **Core logic:** 90%+
- **Service layer:** 95%+
- **API routes:** 85%+
- **Components:** 70%+

### Testability Patterns

**Dependency Injection:**
```typescript
// lib/s3.ts supports DI
export function createS3Client(config?: S3Config): S3Client;
export function uploadToS3(key, buffer, type, client?: S3Client);

// In tests:
const mockClient = createMockS3Client();
await uploadToS3("key", buffer, "audio/mpeg", mockClient);
```

**Service Layer:**
```typescript
// Business logic extracted from API routes
import { uploadMix, validateFileSize } from "@/lib/services/upload-service";

// Testable in isolation
const result = await uploadMix({ title, artist, audioFile, uploaderId });
```

**Graceful Degradation:**
```typescript
// Cache, rate-limit, audit all fail gracefully
// Tests verify error handling doesn't break operations
```

### Common Test Scenarios

**Testing Auth Guards:**
```typescript
mockGetSession.mockResolvedValue(null);
const response = await GET(request);
expect(response.status).toBe(401);
```

**Testing API Routes:**
```typescript
const request = new NextRequest("http://localhost:3000/api/mixes");
const response = await GET(request);
expect(response.status).toBe(200);
```

**Testing Components:**
```typescript
const { result } = renderHook(() => useAudioPlayer(), { wrapper });
act(() => result.current.playMix(mix));
expect(result.current.currentMix).toEqual(mix);
```

---

## Summary

MixDrop is a Next.js 15 application with:
- **OAuth authentication:** Industry-standard SSO with database sessions
- **Persistent player:** Global audio state survives navigation
- **Redis caching:** Graceful degradation, authentication-aware
- **S3 storage:** MinIO (dev) or AWS S3 (prod) with endpoint translation
- **Observability:** Pino → Loki → Grafana with 5 pre-built dashboards
- **Structured logging:** All events tracked with requestId correlation
- **Precomputed waveforms:** Generated during upload for instant display
- **Playlist ordering:** Drag-and-drop with explicit order field
- **Comprehensive testing:** 324+ tests with Vitest, 80% coverage target, CI/CD integrated

For specific implementations, refer to source code with this architectural context.

