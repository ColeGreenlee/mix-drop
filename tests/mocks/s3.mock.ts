import { vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";

/**
 * Mock S3 client for testing
 * Use this to avoid making real S3 calls during tests
 */

// In-memory storage for mock S3 objects
const mockS3Storage = new Map<string, Buffer>();

/**
 * Mock S3Client implementation
 */
export const createMockS3Client = () => {
  return {
    send: vi.fn(async (command: any) => {
      // Handle PutObjectCommand
      if (command.constructor.name === "PutObjectCommand") {
        const key = command.input.Key;
        const body = command.input.Body;
        mockS3Storage.set(key, body);
        return {
          ETag: '"mock-etag"',
          VersionId: "mock-version-id",
        };
      }

      // Handle DeleteObjectCommand
      if (command.constructor.name === "DeleteObjectCommand") {
        const key = command.input.Key;
        mockS3Storage.delete(key);
        return {
          DeleteMarker: true,
          VersionId: "mock-version-id",
        };
      }

      // Handle GetObjectCommand
      if (command.constructor.name === "GetObjectCommand") {
        const key = command.input.Key;
        const body = mockS3Storage.get(key);
        if (!body) {
          throw new Error("NoSuchKey");
        }
        return {
          Body: body,
          ContentLength: body.length,
          ContentType: "audio/mpeg",
        };
      }

      return {};
    }),
  } as unknown as S3Client;
};

/**
 * Mock getSignedUrl function
 */
export const mockGetSignedUrl = vi.fn(
  async (client: S3Client, command: any) => {
    const key = command.input.Key;
    return `https://mock-s3.com/${key}?signature=mock-signature`;
  }
);

/**
 * Clear mock S3 storage
 */
export const clearMockS3Storage = () => {
  mockS3Storage.clear();
};

/**
 * Get mock S3 storage for assertions
 */
export const getMockS3Storage = () => {
  return new Map(mockS3Storage);
};

/**
 * Check if a key exists in mock storage
 */
export const mockS3Has = (key: string): boolean => {
  return mockS3Storage.has(key);
};

/**
 * Get object from mock storage
 */
export const mockS3Get = (key: string): Buffer | undefined => {
  return mockS3Storage.get(key);
};

/**
 * Mock the entire @aws-sdk/client-s3 module
 * Usage: vi.mock('@aws-sdk/client-s3', () => mockS3Module())
 */
export const mockS3Module = () => ({
  S3Client: vi.fn(() => createMockS3Client()),
  PutObjectCommand: vi.fn((input) => ({ input })),
  DeleteObjectCommand: vi.fn((input) => ({ input })),
  GetObjectCommand: vi.fn((input) => ({ input })),
});

/**
 * Mock the @aws-sdk/s3-request-presigner module
 */
export const mockS3PresignerModule = () => ({
  getSignedUrl: mockGetSignedUrl,
});
