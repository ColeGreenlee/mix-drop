import { vi } from "vitest";

/**
 * Mock S3 client for testing
 * Simulates S3 operations without actual AWS calls
 */
export class MockS3Client {
  private storage: Map<string, Buffer> = new Map();

  send = vi.fn(async (command: any) => {
    const commandName = command.constructor.name;

    switch (commandName) {
      case "PutObjectCommand":
        this.storage.set(command.input.Key, command.input.Body);
        return { $metadata: { httpStatusCode: 200 } };

      case "DeleteObjectCommand":
        this.storage.delete(command.input.Key);
        return { $metadata: { httpStatusCode: 204 } };

      case "GetObjectCommand":
        const data = this.storage.get(command.input.Key);
        if (!data) {
          throw new Error("NoSuchKey");
        }
        return { Body: data };

      case "HeadObjectCommand":
        if (!this.storage.has(command.input.Key)) {
          throw new Error("NotFound");
        }
        return {
          ContentLength: this.storage.get(command.input.Key)?.length,
          ContentType: "audio/mpeg",
        };

      default:
        return {};
    }
  });

  // Helper to check storage in tests
  _getStorage() {
    return this.storage;
  }

  clear() {
    this.storage.clear();
  }
}

/**
 * Mock S3 presigned URL function
 */
export const mockGetSignedUrl = vi.fn(
  async (client: any, command: any) => {
    const key = command.input.Key;
    return `https://s3.amazonaws.com/test-bucket/${key}?signature=mock`;
  }
);

/**
 * Create mock S3 client
 */
export function createMockS3Client() {
  return new MockS3Client();
}

/**
 * Mock S3 module
 */
export function mockS3Module() {
  vi.mock("@aws-sdk/client-s3", () => ({
    S3Client: vi.fn(() => createMockS3Client()),
    PutObjectCommand: vi.fn((input) => ({ input, constructor: { name: "PutObjectCommand" } })),
    DeleteObjectCommand: vi.fn((input) => ({ input, constructor: { name: "DeleteObjectCommand" } })),
    GetObjectCommand: vi.fn((input) => ({ input, constructor: { name: "GetObjectCommand" } })),
    HeadObjectCommand: vi.fn((input) => ({ input, constructor: { name: "HeadObjectCommand" } })),
  }));

  vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: mockGetSignedUrl,
  }));
}
