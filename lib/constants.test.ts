import { describe, it, expect } from "vitest";
import {
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
  CACHE_TTL,
  RATE_LIMITS,
  PAGINATION,
  INPUT_LIMITS,
  WAVEFORM,
  ERROR_MESSAGES,
} from "./constants";

describe("constants", () => {
  describe("MAX_FILE_SIZES", () => {
    it("should have reasonable file size limits", () => {
      expect(MAX_FILE_SIZES.AUDIO).toBe(200 * 1024 * 1024); // 200MB
      expect(MAX_FILE_SIZES.COVER_ART).toBe(10 * 1024 * 1024); // 10MB
    });

    it("should have audio limit larger than cover art", () => {
      expect(MAX_FILE_SIZES.AUDIO).toBeGreaterThan(MAX_FILE_SIZES.COVER_ART);
    });
  });

  describe("ALLOWED_MIME_TYPES", () => {
    it("should include common audio formats", () => {
      expect(ALLOWED_MIME_TYPES.AUDIO).toContain("audio/mpeg");
      expect(ALLOWED_MIME_TYPES.AUDIO).toContain("audio/mp3");
      expect(ALLOWED_MIME_TYPES.AUDIO).toContain("audio/wav");
    });

    it("should include common image formats", () => {
      expect(ALLOWED_MIME_TYPES.IMAGES).toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES.IMAGES).toContain("image/png");
      expect(ALLOWED_MIME_TYPES.IMAGES).toContain("image/webp");
    });

    it("should not be empty", () => {
      expect(ALLOWED_MIME_TYPES.AUDIO.length).toBeGreaterThan(0);
      expect(ALLOWED_MIME_TYPES.IMAGES.length).toBeGreaterThan(0);
    });
  });

  describe("CACHE_TTL", () => {
    it("should have positive TTL values", () => {
      expect(CACHE_TTL.MIXES_LIST).toBeGreaterThan(0);
      expect(CACHE_TTL.MIX_DETAIL).toBeGreaterThan(0);
      expect(CACHE_TTL.STREAM_URL).toBeGreaterThan(0);
      expect(CACHE_TTL.WAVEFORM_PEAKS).toBeGreaterThan(0);
    });

    it("should have logical TTL hierarchy", () => {
      // Mixes list changes frequently, shortest TTL
      expect(CACHE_TTL.MIXES_LIST).toBeLessThan(CACHE_TTL.MIX_DETAIL);

      // Waveforms never change, longest TTL
      expect(CACHE_TTL.WAVEFORM_PEAKS).toBeGreaterThan(CACHE_TTL.MIX_DETAIL);
    });

    it("should have expected values in seconds", () => {
      expect(CACHE_TTL.MIXES_LIST).toBe(300); // 5 minutes
      expect(CACHE_TTL.MIX_DETAIL).toBe(3600); // 1 hour
      expect(CACHE_TTL.STREAM_URL).toBe(1800); // 30 minutes
      expect(CACHE_TTL.WAVEFORM_PEAKS).toBe(86400); // 24 hours
    });
  });

  describe("RATE_LIMITS", () => {
    it("should have positive rate limits", () => {
      expect(RATE_LIMITS.UPLOAD.MAX_REQUESTS).toBeGreaterThan(0);
      expect(RATE_LIMITS.API.MAX_REQUESTS).toBeGreaterThan(0);
    });

    it("should have positive window durations", () => {
      expect(RATE_LIMITS.UPLOAD.WINDOW_SECONDS).toBeGreaterThan(0);
      expect(RATE_LIMITS.API.WINDOW_SECONDS).toBeGreaterThan(0);
    });

    it("should have stricter upload limits than API limits", () => {
      // Upload should be more restricted
      expect(RATE_LIMITS.UPLOAD.MAX_REQUESTS).toBeLessThan(
        RATE_LIMITS.API.MAX_REQUESTS
      );
    });
  });

  describe("PAGINATION", () => {
    it("should have positive page sizes", () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
      expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(0);
    });

    it("should have max page size greater than default", () => {
      expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThanOrEqual(
        PAGINATION.DEFAULT_PAGE_SIZE
      );
    });

    it("should have reasonable values", () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
      expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
    });
  });

  describe("INPUT_LIMITS", () => {
    it("should have positive length limits", () => {
      expect(INPUT_LIMITS.TITLE_MAX_LENGTH).toBeGreaterThan(0);
      expect(INPUT_LIMITS.ARTIST_MAX_LENGTH).toBeGreaterThan(0);
      expect(INPUT_LIMITS.DESCRIPTION_MAX_LENGTH).toBeGreaterThan(0);
      expect(INPUT_LIMITS.PLAYLIST_NAME_MAX_LENGTH).toBeGreaterThan(0);
      expect(INPUT_LIMITS.PLAYLIST_DESCRIPTION_MAX_LENGTH).toBeGreaterThan(0);
    });

    it("should have logical length hierarchy", () => {
      // Description should allow more text than title
      expect(INPUT_LIMITS.DESCRIPTION_MAX_LENGTH).toBeGreaterThan(
        INPUT_LIMITS.TITLE_MAX_LENGTH
      );

      // Title should allow more text than artist
      expect(INPUT_LIMITS.TITLE_MAX_LENGTH).toBeGreaterThan(
        INPUT_LIMITS.ARTIST_MAX_LENGTH
      );
    });
  });

  describe("WAVEFORM", () => {
    it("should have positive sample count", () => {
      expect(WAVEFORM.DEFAULT_SAMPLES).toBeGreaterThan(0);
    });

    it("should have positive heights", () => {
      expect(WAVEFORM.CARD_HEIGHT).toBeGreaterThan(0);
      expect(WAVEFORM.PLAYER_HEIGHT).toBeGreaterThan(0);
    });

    it("should have player height greater than card height", () => {
      expect(WAVEFORM.PLAYER_HEIGHT).toBeGreaterThan(WAVEFORM.CARD_HEIGHT);
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("should have non-empty error messages", () => {
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(message).toBeTruthy();
        expect(typeof message).toBe("string");
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it("should have all expected error types", () => {
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBeDefined();
      expect(ERROR_MESSAGES.FORBIDDEN).toBeDefined();
      expect(ERROR_MESSAGES.NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.FILE_TOO_LARGE).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_FILE_TYPE).toBeDefined();
      expect(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED).toBeDefined();
      expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
    });

    it("should have user-friendly messages", () => {
      // Messages should not expose internal implementation details
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(message).not.toMatch(/exception|stack|trace/i);
        // "error" is okay in user-facing messages like "An error occurred"
      });
    });
  });
});
