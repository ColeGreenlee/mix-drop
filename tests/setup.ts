import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Extend Vitest matchers with Testing Library's DOM matchers
// This enables assertions like expect(element).toBeInTheDocument()

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock CSS imports (Vitest doesn't need to process CSS)
vi.mock("*.css", () => ({}));
vi.mock("*.scss", () => ({}));

// Mock environment variables for tests
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NODE_ENV = "test";

// S3 environment variables (needed for s3.ts module loading)
process.env.S3_ENDPOINT = "http://localhost:9000";
process.env.S3_PUBLIC_ENDPOINT = "http://localhost:9000";
process.env.S3_BUCKET = "test-bucket";
process.env.S3_ACCESS_KEY = "test-key";
process.env.S3_SECRET_KEY = "test-secret";
process.env.S3_REGION = "us-east-1";

// Redis environment variables
process.env.REDIS_URL = "redis://localhost:6379";

// Mock navigator.clipboard for user-event tests
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
    writable: true,
  });
}

// Suppress console warnings during tests (optional)
// Uncomment if tests generate too much noise
// const originalWarn = console.warn;
// beforeAll(() => {
//   console.warn = (...args: any[]) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning: ReactDOM.render')
//     ) {
//       return;
//     }
//     originalWarn.call(console, ...args);
//   };
// });

// afterAll(() => {
//   console.warn = originalWarn;
// });
