import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies - MUST be hoisted
vi.mock("@/lib/s3", () => ({
  uploadToS3: vi.fn(),
  generateStorageKey: vi.fn((userId, filename, folder) => `${folder}/${userId}/${filename}`),
}));

vi.mock("@/lib/waveform", () => ({
  generateWaveformPeaks: vi.fn(() => [[0.5, 0.6], [0.4, 0.5]]),
}));

vi.mock("@/lib/cache", () => ({
  cacheDeletePattern: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    mix: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  logger: { info: vi.fn() },
}));

vi.mock("music-metadata", () => ({
  parseBuffer: vi.fn(),
}));

import {
  validateFileSize,
  validateFileType,
  sanitizeInput,
  validateMixMetadata,
  extractAudioDuration,
  processFileUpload,
  uploadMix,
} from "./upload-service";
import {
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
} from "@/lib/constants";
import prisma from "@/lib/prisma";

const mockCreate = (prisma.mix.create as any);

describe("upload-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFileSize", () => {
    it("should return null for valid audio file size", () => {
      const file = new File(["content"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 }); // 10MB

      const error = validateFileSize(file, "audio");

      expect(error).toBeNull();
    });

    it("should return error for oversized audio file", () => {
      const file = new File(["content"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(file, "size", { value: MAX_FILE_SIZES.AUDIO + 1 });

      const error = validateFileSize(file, "audio");

      expect(error).not.toBeNull();
      expect(error?.field).toBe("audio");
      expect(error?.message).toContain("exceeds maximum");
    });

    it("should return null for valid cover art size", () => {
      const file = new File(["content"], "cover.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 }); // 5MB

      const error = validateFileSize(file, "cover");

      expect(error).toBeNull();
    });

    it("should return error for oversized cover art", () => {
      const file = new File(["content"], "cover.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: MAX_FILE_SIZES.COVER_ART + 1 });

      const error = validateFileSize(file, "cover");

      expect(error).not.toBeNull();
      expect(error?.field).toBe("coverArt");
    });

    it("should accept file at exact size limit", () => {
      const file = new File(["content"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(file, "size", { value: MAX_FILE_SIZES.AUDIO });

      const error = validateFileSize(file, "audio");

      expect(error).toBeNull();
    });
  });

  describe("validateFileType", () => {
    it("should return null for valid audio MIME type", () => {
      ALLOWED_MIME_TYPES.AUDIO.forEach((mimeType) => {
        const file = new File(["content"], "test.audio", { type: mimeType });
        const error = validateFileType(file, "audio");
        expect(error).toBeNull();
      });
    });

    it("should return error for invalid audio MIME type", () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const error = validateFileType(file, "audio");

      expect(error).not.toBeNull();
      expect(error?.field).toBe("audio");
      expect(error?.message).toContain("Invalid file type");
    });

    it("should return null for valid image MIME type", () => {
      ALLOWED_MIME_TYPES.IMAGES.forEach((mimeType) => {
        const file = new File(["content"], "test.img", { type: mimeType });
        const error = validateFileType(file, "cover");
        expect(error).toBeNull();
      });
    });

    it("should return error for invalid image MIME type", () => {
      const file = new File(["content"], "test.mp3", { type: "audio/mpeg" });
      const error = validateFileType(file, "cover");

      expect(error).not.toBeNull();
      expect(error?.field).toBe("coverArt");
    });
  });

  describe("sanitizeInput", () => {
    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello  ", 100)).toBe("hello");
    });

    it("should truncate to max length", () => {
      const longString = "a".repeat(200);
      expect(sanitizeInput(longString, 50)).toHaveLength(50);
    });

    it("should return null for empty string", () => {
      expect(sanitizeInput("", 100)).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(sanitizeInput("   ", 100)).toBeNull();
    });

    it("should return null for null input", () => {
      expect(sanitizeInput(null, 100)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(sanitizeInput(undefined, 100)).toBeNull();
    });

    it("should handle max length of 0", () => {
      expect(sanitizeInput("hello", 0)).toBe("");
    });

    it("should preserve valid content", () => {
      expect(sanitizeInput("Hello World!", 100)).toBe("Hello World!");
    });
  });

  describe("validateMixMetadata", () => {
    it("should return no errors for valid metadata", () => {
      const errors = validateMixMetadata({
        title: "My Mix",
        artist: "DJ Test",
        description: "A great mix",
      });

      expect(errors).toHaveLength(0);
    });

    it("should return error for missing title", () => {
      const errors = validateMixMetadata({
        title: "",
        artist: "DJ Test",
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("title");
      expect(errors[0].message).toContain("required");
    });

    it("should return error for missing artist", () => {
      const errors = validateMixMetadata({
        title: "My Mix",
        artist: "",
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("artist");
    });

    it("should return multiple errors when both missing", () => {
      const errors = validateMixMetadata({
        title: "",
        artist: "",
      });

      expect(errors).toHaveLength(2);
    });

    it("should handle whitespace-only inputs", () => {
      const errors = validateMixMetadata({
        title: "   ",
        artist: "   ",
      });

      expect(errors).toHaveLength(2);
    });

    it("should accept metadata without description", () => {
      const errors = validateMixMetadata({
        title: "My Mix",
        artist: "DJ Test",
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe("extractAudioDuration", () => {
    it("should extract duration from metadata", async () => {
      const { parseBuffer } = await import("music-metadata");
      (parseBuffer as any).mockResolvedValueOnce({
        format: { duration: 180.5 },
      });

      const buffer = Buffer.from("audio data");
      const duration = await extractAudioDuration(buffer, "audio/mpeg");

      expect(duration).toBe(180); // Floored
      expect(parseBuffer).toHaveBeenCalledWith(buffer, { mimeType: "audio/mpeg" });
    });

    it("should return 0 when duration is missing", async () => {
      const { parseBuffer } = await import("music-metadata");
      (parseBuffer as any).mockResolvedValueOnce({
        format: {},
      });

      const buffer = Buffer.from("audio data");
      const duration = await extractAudioDuration(buffer, "audio/mpeg");

      expect(duration).toBe(0);
    });

    it("should return 0 on parsing error", async () => {
      const { parseBuffer } = await import("music-metadata");
      (parseBuffer as any).mockRejectedValueOnce(new Error("Parse error"));

      const buffer = Buffer.from("audio data");
      const duration = await extractAudioDuration(buffer, "audio/mpeg");

      expect(duration).toBe(0); // Graceful degradation
    });

    it("should floor fractional durations", async () => {
      const { parseBuffer } = await import("music-metadata");
      (parseBuffer as any).mockResolvedValueOnce({
        format: { duration: 123.789 },
      });

      const buffer = Buffer.from("audio data");
      const duration = await extractAudioDuration(buffer, "audio/mpeg");

      expect(duration).toBe(123);
    });
  });

  describe("processFileUpload", () => {
    it("should upload audio file to S3", async () => {
      const { uploadToS3 } = await import("@/lib/s3");

      const file = new File(["audio content"], "test.mp3", {
        type: "audio/mpeg",
      });

      const storageKey = await processFileUpload({
        file,
        userId: "user-123",
        type: "audio",
      });

      expect(uploadToS3).toHaveBeenCalled();
      expect(storageKey).toContain("mixes/user-123");
    });

    it("should upload cover art to S3", async () => {
      const { uploadToS3 } = await import("@/lib/s3");

      const file = new File(["image content"], "cover.jpg", {
        type: "image/jpeg",
      });

      const storageKey = await processFileUpload({
        file,
        userId: "user-456",
        type: "cover",
      });

      expect(uploadToS3).toHaveBeenCalled();
      expect(storageKey).toContain("covers/user-456");
    });
  });

  describe("uploadMix", () => {
    beforeEach(async () => {
      const { parseBuffer } = await import("music-metadata");
      (parseBuffer as any).mockResolvedValue({ format: { duration: 180 } });

      mockCreate.mockResolvedValue({
        id: "mix-123",
        title: "Test Mix",
        artist: "DJ Test",
        uploader: { id: "user-1", name: "Test User", email: "test@test.com" },
      });
    });

    it("should upload mix with all data", async () => {
      const audioFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
      const coverArt = new File(["image"], "cover.jpg", { type: "image/jpeg" });
      Object.defineProperty(audioFile, "size", { value: 1000000 });
      Object.defineProperty(coverArt, "size", { value: 100000 });

      const mix = await uploadMix({
        title: "Test Mix",
        artist: "DJ Test",
        description: "A test mix",
        isPublic: true,
        audioFile,
        coverArt,
        uploaderId: "user-123",
      });

      expect(mix).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();
    });

    it("should upload mix without cover art", async () => {
      const audioFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(audioFile, "size", { value: 1000000 });

      const mix = await uploadMix({
        title: "Test Mix",
        artist: "DJ Test",
        isPublic: true,
        audioFile,
        uploaderId: "user-123",
      });

      expect(mix).toBeDefined();
    });

    it("should throw error for invalid title", async () => {
      const audioFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(audioFile, "size", { value: 1000000 });

      await expect(
        uploadMix({
          title: "   ",
          artist: "DJ Test",
          isPublic: true,
          audioFile,
          uploaderId: "user-123",
        })
      ).rejects.toThrow("Title is required");
    });

    it("should throw error for oversized audio file", async () => {
      const audioFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(audioFile, "size", { value: MAX_FILE_SIZES.AUDIO + 1 });

      await expect(
        uploadMix({
          title: "Test Mix",
          artist: "DJ Test",
          isPublic: true,
          audioFile,
          uploaderId: "user-123",
        })
      ).rejects.toThrow("exceeds maximum");
    });

    it("should sanitize inputs correctly", async () => {
      const audioFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(audioFile, "size", { value: 1000000 });

      await uploadMix({
        title: "  Test Mix  ",
        artist: "  DJ Test  ",
        description: "  Description  ",
        isPublic: true,
        audioFile,
        uploaderId: "user-123",
      });

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.data.title).toBe("Test Mix");
      expect(createCall.data.artist).toBe("DJ Test");
      expect(createCall.data.description).toBe("Description");
    });

    it("should invalidate cache after upload", async () => {
      const { cacheDeletePattern } = await import("@/lib/cache");
      const audioFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
      Object.defineProperty(audioFile, "size", { value: 1000000 });

      await uploadMix({
        title: "Test Mix",
        artist: "DJ Test",
        isPublic: true,
        audioFile,
        uploaderId: "user-123",
      });

      expect(cacheDeletePattern).toHaveBeenCalledWith("mixes:list:*");
    });
  });
});
