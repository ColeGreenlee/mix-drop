import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleApiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  rateLimitExceeded,
} from "@/lib/api-errors";
import { ERROR_MESSAGES } from "@/lib/constants";

// Mock the logger module
vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  getRequestId: vi.fn(() => "test-request-id"),
}));

describe("API Error Handlers", () => {
  describe("handleApiError", () => {
    it("should return 500 status with generic error message", async () => {
      const error = new Error("Internal error");
      const response = handleApiError(error, "test_context");

      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({ error: ERROR_MESSAGES.SERVER_ERROR });
    });

    it("should accept custom status code", async () => {
      const error = new Error("Custom error");
      const response = handleApiError(error, "test_context", 503);

      expect(response.status).toBe(503);
    });

    it("should handle non-Error objects", async () => {
      const response = handleApiError("string error", "test_context");

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json).toEqual({ error: ERROR_MESSAGES.SERVER_ERROR });
    });

    it("should handle null errors", async () => {
      const response = handleApiError(null, "test_context");

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json).toEqual({ error: ERROR_MESSAGES.SERVER_ERROR });
    });
  });

  describe("unauthorized", () => {
    it("should return 401 with default message", async () => {
      const response = unauthorized();

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: ERROR_MESSAGES.UNAUTHORIZED });
    });

    it("should accept custom message", async () => {
      const customMessage = "Please log in to continue";
      const response = unauthorized(customMessage);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: customMessage });
    });
  });

  describe("forbidden", () => {
    it("should return 403 with default message", async () => {
      const response = forbidden();

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json).toEqual({ error: ERROR_MESSAGES.FORBIDDEN });
    });

    it("should accept custom message", async () => {
      const customMessage = "Admin access required";
      const response = forbidden(customMessage);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json).toEqual({ error: customMessage });
    });
  });

  describe("notFound", () => {
    it("should return 404 with default message", async () => {
      const response = notFound();

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json).toEqual({ error: ERROR_MESSAGES.NOT_FOUND });
    });

    it("should accept custom message", async () => {
      const customMessage = "Mix not found";
      const response = notFound(customMessage);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json).toEqual({ error: customMessage });
    });
  });

  describe("badRequest", () => {
    it("should return 400 with custom message", async () => {
      const message = "Invalid input";
      const response = badRequest(message);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({ error: message });
    });

    it("should require a message parameter", async () => {
      const message = "Title is required";
      const response = badRequest(message);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe(message);
    });
  });

  describe("rateLimitExceeded", () => {
    it("should return 429 with retry-after header", async () => {
      const retryAfter = 60;
      const response = rateLimitExceeded(retryAfter);

      expect(response.status).toBe(429);

      const json = await response.json();
      expect(json).toEqual({
        error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        retryAfter,
      });

      expect(response.headers.get("Retry-After")).toBe("60");
    });

    it("should handle different retry-after values", async () => {
      const retryAfter = 300;
      const response = rateLimitExceeded(retryAfter);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("300");

      const json = await response.json();
      expect(json.retryAfter).toBe(300);
    });

    it("should work with zero retry-after", async () => {
      const response = rateLimitExceeded(0);

      expect(response.headers.get("Retry-After")).toBe("0");
    });
  });
});
