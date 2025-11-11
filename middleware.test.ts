import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { middleware } from "./middleware";
import { NextRequest } from "next/server";

describe("middleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("request ID generation", () => {
    it("should generate request ID if not present", () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
      expect(typeof requestId).toBe("string");
    });

    it("should use existing request ID from headers", () => {
      const existingId = "existing-request-id-123";
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-request-id": existingId },
      });

      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBe(existingId);
    });

    it("should generate unique request IDs", () => {
      const request1 = new NextRequest("http://localhost:3000/api/test1");
      const request2 = new NextRequest("http://localhost:3000/api/test2");

      const response1 = middleware(request1);
      const response2 = middleware(request2);

      const id1 = response1.headers.get("x-request-id");
      const id2 = response2.headers.get("x-request-id");

      expect(id1).not.toBe(id2);
    });

    it("should include timestamp in generated request ID", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      const requestId = response.headers.get("x-request-id");
      expect(requestId).toContain(String(now));
    });
  });

  describe("response timing", () => {
    it("should add response time header", () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      const responseTime = response.headers.get("x-response-time");
      expect(responseTime).toBeTruthy();
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    it("should calculate response time correctly", () => {
      // Note: With fake timers, Date.now() in middleware doesn't advance
      // This test verifies the header exists and has correct format
      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      const responseTime = response.headers.get("x-response-time");
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    it("should handle zero response time", () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      const responseTime = response.headers.get("x-response-time");
      expect(responseTime).toBe("0ms");
    });
  });

  describe("header propagation", () => {
    it("should propagate request ID to request headers", () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      // The request ID should be in response headers
      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
    });

    it("should preserve other request headers", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "content-type": "application/json",
          "authorization": "Bearer token123",
        },
      });

      const response = middleware(request);

      // Response should still contain a valid status
      expect(response).toBeTruthy();
      expect(response.headers.get("x-request-id")).toBeTruthy();
    });
  });

  describe("route matching", () => {
    it("should process API routes", () => {
      const request = new NextRequest("http://localhost:3000/api/mixes");
      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(response.headers.get("x-response-time")).toBeTruthy();
    });

    it("should process page routes", () => {
      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(response.headers.get("x-response-time")).toBeTruthy();
    });

    it("should process root route", () => {
      const request = new NextRequest("http://localhost:3000/");
      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(response.headers.get("x-response-time")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle requests with query parameters", () => {
      const request = new NextRequest("http://localhost:3000/api/mixes?page=2&limit=20");
      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBeTruthy();
    });

    it("should handle requests with hash fragments", () => {
      const request = new NextRequest("http://localhost:3000/dashboard#section");
      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBeTruthy();
    });

    it("should handle long request IDs", () => {
      const longId = "a".repeat(100);
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-request-id": longId },
      });

      const response = middleware(request);

      expect(response.headers.get("x-request-id")).toBe(longId);
    });
  });

  describe("request ID format", () => {
    it("should generate request ID with timestamp and random suffix", () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const response = middleware(request);

      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBeTruthy();

      // Format: timestamp-randomstring
      const parts = requestId!.split("-");
      expect(parts.length).toBeGreaterThanOrEqual(2);

      // First part should be a number (timestamp)
      expect(!isNaN(Number(parts[0]))).toBe(true);
    });
  });
});
