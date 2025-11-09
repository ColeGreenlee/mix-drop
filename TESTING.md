# MixDrop Testing Strategy

This document outlines the comprehensive testing strategy implemented for MixDrop, including test organization, running tests, and coverage goals.

## Table of Contents

1. [Overview](#overview)
2. [Test Infrastructure](#test-infrastructure)
3. [Running Tests](#running-tests)
4. [Test Organization](#test-organization)
5. [Coverage Goals](#coverage-goals)
6. [Writing Tests](#writing-tests)
7. [CI/CD Integration](#cicd-integration)

## Overview

MixDrop uses **Vitest** as the primary testing framework, chosen for its:
- Native TypeScript support
- Fast execution with ESM support
- Excellent Next.js integration
- Built-in coverage reporting
- Compatible API with Jest

### Current Test Coverage

- ✅ **lib/waveform.ts** - Waveform peak generation (8 tests)
- ✅ **lib/api-errors.ts** - Error response builders (15 tests)
- ✅ **lib/cache.ts** - Redis caching operations (16 tests)
- ✅ **lib/rate-limit.ts** - Rate limiting logic (12 tests)

**Total:** 51 unit tests covering critical utility functions

## Test Infrastructure

### Framework & Tools

```json
{
  "vitest": "^4.0.8",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/user-event": "^14.6.1",
  "@vitest/coverage-v8": "^4.0.8",
  "@vitest/ui": "^4.0.8",
  "ioredis-mock": "^8.13.1",
  "supertest": "^7.1.4"
}
```

### Configuration

- **Config file:** `vitest.config.ts`
- **Setup file:** `__tests__/setup.ts`
- **Coverage threshold:** 70% (lines, functions, branches, statements)

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Running Specific Tests

```bash
# Run specific test file
pnpm test __tests__/unit/lib/cache.test.ts

# Run all unit tests
pnpm test -- __tests__/unit

# Run tests matching pattern
pnpm test -- --grep="cache"
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- **HTML report:** `coverage/index.html` (open in browser)
- **LCOV report:** `coverage/lcov.info` (for CI/CD)
- **JSON report:** `coverage/coverage-summary.json`

## Test Organization

```
__tests__/
├── setup.ts                      # Global test setup
├── unit/                         # Unit tests
│   └── lib/                      # Library utilities
│       ├── api-errors.test.ts
│       ├── cache.test.ts
│       ├── rate-limit.test.ts
│       └── waveform.test.ts
├── integration/                  # Integration tests (planned)
│   └── api/                      # API routes
├── components/                   # Component tests (planned)
├── mocks/                        # Mock factories
│   ├── auth.mock.ts
│   ├── prisma.mock.ts
│   ├── redis.mock.ts
│   └── s3.mock.ts
└── helpers/                      # Test utilities
    ├── fixtures.ts               # Test data
    └── test-utils.tsx            # Testing helpers
```

## Coverage Goals

### Priority Levels

**High Priority (Target: 85-95%)**
- ✅ lib/waveform.ts
- ✅ lib/api-errors.ts
- ✅ lib/cache.ts
- ✅ lib/rate-limit.ts
- 🔲 lib/s3.ts
- 🔲 lib/audit.ts
- 🔲 lib/auth-helpers.ts

**Medium Priority (Target: 75-85%)**
- 🔲 API routes (app/api/**)
- 🔲 Business logic services
- 🔲 Validation utilities

**Lower Priority (Target: 60-70%)**
- 🔲 UI components
- 🔲 Complex interactions
- 🔲 Edge cases

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Module Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("functionName", () => {
    it("should handle normal case", () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it("should handle error case", () => {
      // Test error scenarios
    });
  });
});
```

### Using Mock Factories

```typescript
import { createMockSession, createMockAdminSession } from "@/__tests__/mocks/auth.mock";
import { mockUsers, mockMixes } from "@/__tests__/helpers/fixtures";

describe("Protected API Route", () => {
  it("should require authentication", async () => {
    // Use mock session
    const session = createMockSession();

    // Use test fixtures
    const user = mockUsers.regularUser;
  });
});
```

### Testing Async Operations

```typescript
it("should cache data with TTL", async () => {
  await cacheSet("test-key", { data: "value" }, 300);

  const result = await cacheGet("test-key");
  expect(result).toEqual({ data: "value" });
});
```

### Testing Error Handling

```typescript
it("should handle errors gracefully", async () => {
  mockRedis.get.mockRejectedValueOnce(new Error("Connection failed"));

  const result = await cacheGet("key");
  expect(result).toBeNull(); // Graceful degradation
});
```

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- **Push** to `main` branch
- **Pull requests** to `main`
- **Push** to `claude/**` branches (feature branches)

### Workflow Steps

1. ✅ Checkout code
2. ✅ Setup Node.js & pnpm
3. ✅ Install dependencies
4. ✅ Run linter
5. ✅ Run unit tests
6. ✅ Generate coverage report
7. ✅ Upload to Codecov (if configured)
8. ✅ Comment on PR with results

### Quality Gates

- **Minimum coverage:** 70%
- **All tests must pass:** Required for merge
- **Linting:** Enforced but won't block (continue-on-error)

## Best Practices

### ✅ DO

- Write tests for all new features
- Test both success and error paths
- Use descriptive test names
- Keep tests isolated and independent
- Mock external dependencies (Redis, S3, Prisma)
- Use test fixtures for consistent data
- Aim for high coverage on critical paths

### ❌ DON'T

- Don't test implementation details
- Don't write flaky tests (timeouts, race conditions)
- Don't skip tests without good reason
- Don't commit failing tests
- Don't test third-party libraries
- Don't make tests dependent on each other

## Troubleshooting

### Common Issues

**Test timeouts:**
```bash
# Increase timeout in test
it("slow operation", async () => {
  // test code
}, 30000); // 30 second timeout
```

**Mock not working:**
```typescript
// Ensure mocks are defined before imports
vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));
```

**Coverage not updating:**
```bash
# Clear coverage directory
rm -rf coverage/
pnpm test:coverage
```

## Future Enhancements

### Planned Test Additions

1. **Integration Tests** - API routes with mocked dependencies
2. **Component Tests** - React components with Testing Library
3. **E2E Tests** - Critical user flows with Playwright
4. **Visual Regression** - UI component snapshots
5. **Performance Tests** - Load testing for API endpoints

### Automation Improvements

- Pre-commit hooks to run tests
- Automated test generation for new files
- Mutation testing for test quality
- Performance benchmarking in CI

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [CLAUDE.md](./CLAUDE.md) - Architecture guide

## Questions?

For questions about testing strategy or implementation, refer to:
1. This document (TESTING.md)
2. CLAUDE.md architecture guide
3. Inline test comments
4. GitHub Issues for complex scenarios
