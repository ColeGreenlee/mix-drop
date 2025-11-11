import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleApiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  rateLimitExceeded,
} from "./api-errors";
import { ERROR_MESSAGES } from "./constants";

// Mock the logger module
vi.mock("./logger", () => ({
  logError: vi.fn(),
  getRequestId: vi.fn(() => "test-request-id"),
}));

describe("api-errors", () => {
  describe("handleApiError", () => {
    it("should return 500 status by default", async () => {
      const error = new Error("Test error");
      const response = handleApiError(error, "test_context");

      expect(response.status).toBe(500);
    });

    it("should return custom status code", async () => {
      const error = new Error("Test error");
      const response = handleApiError(error, "test_context", 503);

      expect(response.status).toBe(503);
    });

    it("should return generic error message", async () => {
      const error = new Error("Internal database error"); // Should not be exposed
      const response = handleApiError(error, "test_context");

      const data = await response.json();
      expect(data.error).toBe(ERROR_MESSAGES.SERVER_ERROR);
      expect(data.error).not.toContain("database"); // No internal details
    });

    it("should call logError with context", async () => {
      const { logError } = await import("./logger");
      const error = new Error("Test error");

      handleApiError(error, "upload_mix", 500);

      expect(logError).toHaveBeenCalledWith(error, {
        context: "upload_mix",
        statusCode: 500,
        requestId: "test-request-id",
      });
    });
  });

  describe("unauthorized", () => {
    it("should return 401 status", async () => {
      const response = unauthorized();
      expect(response.status).toBe(401);
    });

    it("should return default unauthorized message", async () => {
      const response = unauthorized();
      const data = await response.json();

      expect(data.error).toBe(ERROR_MESSAGES.UNAUTHORIZED);
    });

    it("should accept custom message", async () => {
      const customMessage = "Invalid token";
      const response = unauthorized(customMessage);
      const data = await response.json();

      expect(data.error).toBe(customMessage);
    });
  });

  describe("forbidden", () => {
    it("should return 403 status", async () => {
      const response = forbidden();
      expect(response.status).toBe(403);
    });

    it("should return default forbidden message", async () => {
      const response = forbidden();
      const data = await response.json();

      expect(data.error).toBe(ERROR_MESSAGES.FORBIDDEN);
    });

    it("should accept custom message", async () => {
      const customMessage = "Admin access required";
      const response = forbidden(customMessage);
      const data = await response.json();

      expect(data.error).toBe(customMessage);
    });
  });

  describe("notFound", () => {
    it("should return 404 status", async () => {
      const response = notFound();
      expect(response.status).toBe(404);
    });

    it("should return default not found message", async () => {
      const response = notFound();
      const data = await response.json();

      expect(data.error).toBe(ERROR_MESSAGES.NOT_FOUND);
    });

    it("should accept custom message", async () => {
      const customMessage = "Mix not found";
      const response = notFound(customMessage);
      const data = await response.json();

      expect(data.error).toBe(customMessage);
    });
  });

  describe("badRequest", () => {
    it("should return 400 status", async () => {
      const response = badRequest("Invalid input");
      expect(response.status).toBe(400);
    });

    it("should return provided error message", async () => {
      const message = "Title is required";
      const response = badRequest(message);
      const data = await response.json();

      expect(data.error).toBe(message);
    });
  });

  describe("rateLimitExceeded", () => {
    it("should return 429 status", async () => {
      const response = rateLimitExceeded(60);
      expect(response.status).toBe(429);
    });

    it("should return rate limit message", async () => {
      const response = rateLimitExceeded(60);
      const data = await response.json();

      expect(data.error).toBe(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
    });

    it("should include retryAfter in response body", async () => {
      const retryAfter = 120;
      const response = rateLimitExceeded(retryAfter);
      const data = await response.json();

      expect(data.retryAfter).toBe(retryAfter);
    });

    it("should include Retry-After header", async () => {
      const retryAfter = 180;
      const response = rateLimitExceeded(retryAfter);

      expect(response.headers.get("Retry-After")).toBe(String(retryAfter));
    });
  });
});
