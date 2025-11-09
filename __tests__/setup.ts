import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.S3_ENDPOINT = "http://localhost:9000";
process.env.S3_PUBLIC_ENDPOINT = "http://localhost:9000";
process.env.S3_BUCKET = "test-bucket";
process.env.S3_ACCESS_KEY = "test-access-key";
process.env.S3_SECRET_KEY = "test-secret-key";

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.requestSubmit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
