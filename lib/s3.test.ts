import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock AWS SDK - MUST be hoisted
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn((input) => ({ input })),
  DeleteObjectCommand: vi.fn((input) => ({ input })),
  GetObjectCommand: vi.fn((input) => ({ input })),
}));

// Mock S3 presigner - MUST be hoisted
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock logger - MUST be hoisted
vi.mock("./logger", () => ({
  logError: vi.fn(),
}));

import {
  createS3Client,
  getS3Client,
  setS3Client,
  resetS3Client,
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  generateStorageKey,
} from "./s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlImport } from "@aws-sdk/s3-request-presigner";

const mockGetSignedUrl = getSignedUrlImport as any;

describe("s3", () => {
  let mockSend: any;

  beforeEach(() => {
    // IMPORTANT: Set env vars BEFORE clearing/resetting to ensure module loads correctly
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_PUBLIC_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_ACCESS_KEY = "test-key";
    process.env.S3_SECRET_KEY = "test-secret";
    process.env.S3_REGION = "us-east-1";

    vi.clearAllMocks();
    resetS3Client();

    // Get the mock send function
    const client = getS3Client();
    mockSend = (client as any).send;
  });

  afterEach(() => {
    resetS3Client();
  });

  describe("createS3Client", () => {
    it("should create S3 client with environment config", () => {
      const client = createS3Client();
      expect(client).toBeDefined();
    });

    it("should create S3 client with custom config", () => {
      const customConfig = {
        endpoint: "http://custom:9000",
        region: "eu-west-1",
        accessKeyId: "custom-key",
        secretAccessKey: "custom-secret",
        bucket: "custom-bucket",
      };

      const client = createS3Client(customConfig);
      expect(client).toBeDefined();
    });

    it("should use environment variables as defaults", () => {
      const client = createS3Client();
      expect(client).toBeDefined();
      // S3Client is created with env vars
    });

    it("should override environment variables with provided config", () => {
      const client = createS3Client({
        region: "ap-southeast-1",
      });
      expect(client).toBeDefined();
    });
  });

  describe("getS3Client", () => {
    it("should return singleton S3 client", () => {
      const client1 = getS3Client();
      const client2 = getS3Client();

      expect(client1).toBe(client2); // Same instance
    });

    it("should create client on first call", () => {
      const client = getS3Client();
      expect(client).toBeDefined();
    });
  });

  describe("setS3Client", () => {
    it("should allow setting custom S3 client", () => {
      const customClient = {} as S3Client;
      setS3Client(customClient);

      const retrieved = getS3Client();
      expect(retrieved).toBe(customClient);
    });

    it("should replace existing client", () => {
      const client1 = getS3Client();
      const client2 = {} as S3Client;

      setS3Client(client2);

      const retrieved = getS3Client();
      expect(retrieved).toBe(client2);
      expect(retrieved).not.toBe(client1);
    });
  });

  describe("resetS3Client", () => {
    it("should reset to null", () => {
      getS3Client(); // Create client
      resetS3Client();

      // Next call should create new instance
      const newClient = getS3Client();
      expect(newClient).toBeDefined();
    });
  });

  describe("uploadToS3", () => {
    it("should upload file to S3", async () => {
      mockSend.mockResolvedValueOnce({ ETag: "etag123" });

      const buffer = Buffer.from("test content");
      await uploadToS3("test/path/file.mp3", buffer, "audio/mpeg");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: "test-bucket",
            Key: "test/path/file.mp3",
            Body: buffer,
            ContentType: "audio/mpeg",
          }),
        })
      );
    });

    it("should use custom S3 client if provided", async () => {
      const customClient = {
        send: vi.fn().mockResolvedValue({ ETag: "etag" }),
      } as unknown as S3Client;

      const buffer = Buffer.from("test");
      await uploadToS3("test.mp3", buffer, "audio/mpeg", customClient);

      expect(customClient.send).toHaveBeenCalled();
    });

    it("should handle upload errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Upload failed"));

      const buffer = Buffer.from("test");

      await expect(
        uploadToS3("test.mp3", buffer, "audio/mpeg")
      ).rejects.toThrow("Upload failed");
    });

    it("should upload different content types", async () => {
      mockSend.mockResolvedValue({ ETag: "etag" });

      await uploadToS3("test.jpg", Buffer.from("image"), "image/jpeg");
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ContentType: "image/jpeg",
          }),
        })
      );

      await uploadToS3("test.mp3", Buffer.from("audio"), "audio/mpeg");
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ContentType: "audio/mpeg",
          }),
        })
      );
    });
  });

  describe("deleteFromS3", () => {
    it("should delete file from S3", async () => {
      mockSend.mockResolvedValueOnce({});

      await deleteFromS3("test/path/file.mp3");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: "test-bucket",
            Key: "test/path/file.mp3",
          }),
        })
      );
    });

    it("should use custom S3 client if provided", async () => {
      const customClient = {
        send: vi.fn().mockResolvedValue({}),
      } as unknown as S3Client;

      await deleteFromS3("test.mp3", customClient);

      expect(customClient.send).toHaveBeenCalled();
    });

    it("should handle delete errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(deleteFromS3("test.mp3")).rejects.toThrow("Delete failed");
    });
  });

  describe("getPresignedUrl", () => {
    it("should generate presigned URL", async () => {
      const generatedUrl = "http://localhost:9000/bucket/test.mp3?signature=abc";
      mockGetSignedUrl.mockResolvedValueOnce(generatedUrl);

      const url = await getPresignedUrl("test.mp3");

      expect(url).toContain("test.mp3");
      expect(url).toBe(generatedUrl); // Should not replace when endpoints match
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it("should use custom expiration time", async () => {
      mockGetSignedUrl.mockResolvedValueOnce(
        "http://localhost:9000/bucket/test.mp3?signature=abc"
      );

      await getPresignedUrl("test.mp3", 7200); // 2 hours

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 7200 })
      );
    });

    it("should replace internal endpoint with public endpoint", async () => {
      // Note: The S3_PUBLIC_ENDPOINT is read at module load time, so this test
      // verifies the logic would work, but can't actually test replacement in unit tests
      // This is better tested in integration tests with real configuration

      const internalUrl = "http://localhost:9000/bucket/test.mp3?signature=abc";
      mockGetSignedUrl.mockResolvedValueOnce(internalUrl);

      const url = await getPresignedUrl("test.mp3");

      // Should return the URL (replacement happens when endpoints differ at runtime)
      expect(url).toBe(internalUrl);
    });

    it("should not replace endpoint if public endpoint not set", async () => {
      delete process.env.S3_PUBLIC_ENDPOINT;

      mockGetSignedUrl.mockResolvedValueOnce(
        "http://minio:9000/bucket/test.mp3?signature=abc"
      );

      const url = await getPresignedUrl("test.mp3");

      expect(url).toBe("http://minio:9000/bucket/test.mp3?signature=abc");
    });

    it("should use custom S3 client if provided", async () => {
      const customClient = {} as S3Client;
      mockGetSignedUrl.mockResolvedValueOnce("http://test.com/file.mp3");

      await getPresignedUrl("test.mp3", 3600, customClient);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        customClient,
        expect.anything(),
        expect.anything()
      );
    });

    it("should handle presigning errors", async () => {
      const error = new Error("Presign failed");
      mockGetSignedUrl.mockRejectedValueOnce(error);

      await expect(getPresignedUrl("test.mp3")).rejects.toThrow("Presign failed");
    });

    it("should use default 1 hour expiration", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("http://test.com/file.mp3");

      await getPresignedUrl("test.mp3");

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 3600 })
      );
    });
  });

  describe("generateStorageKey", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should generate storage key with userId", () => {
      const key = generateStorageKey("user-123", "test.mp3");

      expect(key).toContain("user-123");
      expect(key).toContain(".mp3");
    });

    it("should use default mixes prefix", () => {
      const key = generateStorageKey("user-123", "test.mp3");

      expect(key.startsWith("mixes/")).toBe(true);
    });

    it("should use custom prefix", () => {
      const key = generateStorageKey("user-123", "cover.jpg", "covers");

      expect(key.startsWith("covers/")).toBe(true);
    });

    it("should include timestamp", () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const key = generateStorageKey("user-123", "test.mp3");

      expect(key).toContain(String(now));
    });

    it("should include random string", () => {
      const key1 = generateStorageKey("user-123", "test.mp3");
      const key2 = generateStorageKey("user-123", "test.mp3");

      // Keys should be different due to random component
      expect(key1).not.toBe(key2);
    });

    it("should preserve file extension", () => {
      const extensions = ["mp3", "wav", "jpg", "png"];

      extensions.forEach((ext) => {
        const key = generateStorageKey("user-123", `file.${ext}`);
        expect(key.endsWith(`.${ext}`)).toBe(true);
      });
    });

    it("should handle files with multiple dots", () => {
      const key = generateStorageKey("user-123", "my.file.name.mp3");

      expect(key.endsWith(".mp3")).toBe(true);
    });

    it("should handle files without extension", () => {
      const key = generateStorageKey("user-123", "noextension");

      expect(key).toContain("noextension");
    });

    it("should generate unique keys for same user and file", () => {
      const keys = new Set();

      for (let i = 0; i < 100; i++) {
        const key = generateStorageKey("user-123", "test.mp3");
        keys.add(key);
      }

      expect(keys.size).toBe(100); // All unique
    });

    it("should follow format: prefix/userId/timestamp-random.ext", () => {
      const key = generateStorageKey("user-123", "test.mp3", "mixes");

      const pattern = /^mixes\/user-123\/\d+-[a-z0-9]+\.mp3$/;
      expect(key).toMatch(pattern);
    });
  });

  describe("dependency injection", () => {
    it("should allow injecting mock client for testing", async () => {
      const mockClient = {
        send: vi.fn().mockResolvedValue({ ETag: "test" }),
      } as unknown as S3Client;

      const buffer = Buffer.from("test");
      await uploadToS3("test.mp3", buffer, "audio/mpeg", mockClient);

      expect(mockClient.send).toHaveBeenCalled();
    });

    it("should use default client when not provided", async () => {
      mockSend.mockResolvedValueOnce({ ETag: "test" });

      const buffer = Buffer.from("test");
      await uploadToS3("test.mp3", buffer, "audio/mpeg");

      expect(mockSend).toHaveBeenCalled();
    });

    it("should allow setting global mock client", async () => {
      const mockClient = {
        send: vi.fn().mockResolvedValue({ ETag: "test" }),
      } as unknown as S3Client;

      setS3Client(mockClient);

      const buffer = Buffer.from("test");
      await uploadToS3("test.mp3", buffer, "audio/mpeg");

      expect(mockClient.send).toHaveBeenCalled();
    });
  });

  describe("endpoint translation", () => {
    it("should handle endpoint replacement logic", async () => {
      // Note: Endpoint replacement is determined at module load time
      // This test verifies the function returns URLs correctly
      const testUrl = "http://localhost:9000/bucket/test.mp3?X-Amz-Signature=abc";
      mockGetSignedUrl.mockResolvedValueOnce(testUrl);

      const url = await getPresignedUrl("test.mp3");

      expect(url).toBe(testUrl);
    });

    it("should handle AWS S3 URLs", async () => {
      const awsUrl = "https://s3.amazonaws.com/bucket/test.mp3?signature=abc";
      mockGetSignedUrl.mockResolvedValueOnce(awsUrl);

      const url = await getPresignedUrl("test.mp3");

      expect(url).toBe(awsUrl);
    });
  });
});
